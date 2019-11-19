#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const add_stream_1 = __importDefault(require("add-stream"));
const conventional_changelog_1 = __importDefault(require("conventional-changelog"));
const conventional_changelog_angular_1 = __importDefault(require("conventional-changelog-angular"));
const fs_1 = require("fs");
const git_semver_tags_1 = __importDefault(require("git-semver-tags"));
const util_1 = require("util");
const gitSemverTags = util_1.promisify(git_semver_tags_1.default);
conventional_changelog_angular_1.default.then(ang => {
    function chStream(from, to) {
        return conventional_changelog_1.default({
            pkg: { path: 'lerna.json' },
            releaseCount: 0,
            outputUnreleased: to === 'HEAD',
            config: Object.assign(Object.assign({}, ang.conventionalChangelog), { writerOpts: Object.assign(Object.assign({}, ang.conventionalChangelog.writerOpts), { transform: (commit, context) => {
                        const issues = [];
                        commit.notes.forEach(note => {
                            note.title = `BREAKING CHANGES`;
                        });
                        if (commit.type === `feat`) {
                            commit.type = `Features`;
                        }
                        else if (commit.type === `fix`) {
                            commit.type = `Bug Fixes`;
                        }
                        else if (commit.type === `perf`) {
                            commit.type = `Performance Improvements`;
                        }
                        else if (commit.type === `revert` || commit.revert) {
                            commit.type = `Reverts`;
                        }
                        else if (commit.type === `docs`) {
                            commit.type = `Documentation`;
                        }
                        else if (commit.type === `style`) {
                            commit.type = `Styles`;
                        }
                        else if (commit.type === `refactor`) {
                            commit.type = `Code Refactoring`;
                        }
                        else if (commit.type === `test`) {
                            commit.type = `Tests`;
                        }
                        else if (commit.type === `build`) {
                            commit.type = `Build System`;
                        }
                        else if (commit.type === `ci`) {
                            commit.type = `Continuous Integration`;
                        }
                        else {
                            return;
                        }
                        if (commit.scope === `*`) {
                            commit.scope = ``;
                        }
                        if (typeof commit.hash === `string`) {
                            commit.shortHash = commit.hash.substring(0, 7);
                        }
                        if (typeof commit.subject === `string`) {
                            let url = context.repository
                                ? `${context.host}/${context.owner}/${context.repository}`
                                : context.repoUrl;
                            if (url) {
                                url = `${url}/issues/`;
                                commit.subject = commit.subject.replace(/#([0-9]+)/g, (_, issue) => {
                                    issues.push(issue);
                                    return `[#${issue}](${url}${issue})`;
                                });
                            }
                            if (context.host) {
                                commit.subject = commit.subject.replace(/\B@([a-z0-9](?:-?[a-z0-9/]){0,38})/g, (_, username) => {
                                    if (username.includes('/')) {
                                        return `@${username}`;
                                    }
                                    return `[@${username}](${context.host}/${username})`;
                                });
                            }
                        }
                        commit.references = commit.references.filter(reference => {
                            if (issues.indexOf(reference.issue) === -1) {
                                return true;
                            }
                            return false;
                        });
                        return commit;
                    } }), gitRawCommitsOpts: { from, to } })
        });
    }
    gitSemverTags().then((tags) => {
        tags.unshift('HEAD');
        tags.push('');
        tags = tags.reverse();
        let stream = null;
        tags.reduce((from, to) => {
            if (stream)
                stream = chStream(from, to).pipe(add_stream_1.default(stream));
            else
                stream = chStream(from, to);
            return to;
        });
        if (stream)
            stream.pipe(fs_1.createWriteStream('FULL_CHANGELOG.md'));
    });
});
//# sourceMappingURL=index.js.map