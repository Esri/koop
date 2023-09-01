const fs = require('fs-extra');
const deleteAsync = require('del');

async function execute() {
  await deleteNonEssentialFiles();
  return copyReadme();
}

async function deleteNonEssentialFiles() {
  console.log('- deleting nonessential files');
  await fs.remove('.changeset');

  return deleteAsync([
    '.github/dependabot.yml',
    '.github/workflows/*.yml',
    'changeset-to-changelog.js',
    'gh-release.js',
    'README.md'
  ]);
}

async function copyReadme() {
  console.log('- copying readme');
  return fs.copyFile('fork-scripts/README.md', 'README.md');
}

execute()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
