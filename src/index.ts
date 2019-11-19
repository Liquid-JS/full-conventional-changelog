#!/usr/bin/env node

import addStream from 'add-stream'
import conventionalChangelog from 'conventional-changelog'
import angular from 'conventional-changelog-angular'
import { createWriteStream } from 'fs'
import _gitSemverTags from 'git-semver-tags'
import { Stream } from 'stream'
import { promisify } from 'util'

const gitSemverTags = promisify(_gitSemverTags)

angular.then(ang => {

    function chStream(from: string, to: string) {
        return conventionalChangelog({
            pkg: { path: 'lerna.json' },
            releaseCount: 0,
            outputUnreleased: to === 'HEAD',
            config: {
                ...ang.conventionalChangelog,
                writerOpts: {
                    ...ang.conventionalChangelog.writerOpts,
                    // see https://github.com/conventional-changelog/conventional-changelog/blob/master/packages/conventional-changelog-angular/writer-opts.js
                    transform: (commit, context) => {
                        const issues = []

                        commit.notes.forEach(note => {
                            note.title = `BREAKING CHANGES`
                        })

                        if (commit.type === `feat`) {
                            commit.type = `Features`
                        } else if (commit.type === `fix`) {
                            commit.type = `Bug Fixes`
                        } else if (commit.type === `perf`) {
                            commit.type = `Performance Improvements`
                        } else if (commit.type === `revert` || commit.revert) {
                            commit.type = `Reverts`
                        } else if (commit.type === `docs`) {
                            commit.type = `Documentation`
                        } else if (commit.type === `style`) {
                            commit.type = `Styles`
                        } else if (commit.type === `refactor`) {
                            commit.type = `Code Refactoring`
                        } else if (commit.type === `test`) {
                            commit.type = `Tests`
                        } else if (commit.type === `build`) {
                            commit.type = `Build System`
                        } else if (commit.type === `ci`) {
                            commit.type = `Continuous Integration`
                        } else {
                            return
                        }

                        if (commit.scope === `*`) {
                            commit.scope = ``
                        }

                        if (typeof commit.hash === `string`) {
                            commit.shortHash = commit.hash.substring(0, 7)
                        }

                        if (typeof commit.subject === `string`) {
                            let url = context.repository
                                ? `${context.host}/${context.owner}/${context.repository}`
                                : context.repoUrl
                            if (url) {
                                url = `${url}/issues/`
                                // Issue URLs.
                                commit.subject = commit.subject.replace(/#([0-9]+)/g, (_, issue) => {
                                    issues.push(issue)
                                    return `[#${issue}](${url}${issue})`
                                })
                            }
                            if (context.host) {
                                // User URLs.
                                commit.subject = commit.subject.replace(/\B@([a-z0-9](?:-?[a-z0-9/]){0,38})/g, (_, username) => {
                                    if (username.includes('/')) {
                                        return `@${username}`
                                    }

                                    return `[@${username}](${context.host}/${username})`
                                })
                            }
                        }

                        // remove references that already appear in the subject
                        commit.references = commit.references.filter(reference => {
                            if (issues.indexOf(reference.issue) === -1) {
                                return true
                            }

                            return false
                        })

                        return commit
                    }
                },
                gitRawCommitsOpts: { from, to }
            }
        })
    }

    gitSemverTags().then((tags: string[]) => {
        tags.unshift('HEAD')
        tags.push('')
        tags = tags.reverse()
        let stream: Stream = null
        tags.reduce((from, to) => {
            if (stream)
                stream = chStream(from, to).pipe(addStream(stream))
            else
                stream = chStream(from, to)

            return to
        })

        if (stream)
            stream.pipe(createWriteStream('FULL_CHANGELOG.md'))
    })
})
