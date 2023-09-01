const path = require('path');
const fs = require('fs-extra');
const deleteAsync = require('del');
const findInFiles = require('find-in-files');
const { modifyJsonFile } = require('modify-json-file');
const replace = require('replace');
const packages = require('../package.json').workspaces;

async function execute() {
  await deleteNonEssentialFiles();
  await modifyPackageFiles();
  await replacePackageReferences();
  await replaceKoopCoreRefs();
  return copyGithubAction();
}

async function modifyPackageFiles() {
  console.log('- modifying package.json files');

  for (let i = 0; i < packages.length; i++) {
    const filePath = path.join('../', packages[i], 'package.json');
    const packageFile = require(filePath);
    const name = packageFile.name.replace('@koopjs/', '').replace('koop-', '');
    const buildDest = `../../customdata/framework/${name}`;
    const dependencies = stripKoopDeps(packageFile.dependencies);

    await modifyJsonFile(
      path.join(packages[i], 'package.json'),
      {
        name,
        author: undefined,
        description: undefined,
        keywords: undefined,
        dependencies,
        devDependencies: undefined,
        files: undefined,
        contributors: undefined,
        bugs: undefined,
        homepage: undefined,
        repository: undefined,
        directories: undefined,
        types: undefined,
        scripts: {
          clean: `shx rm -rf ${buildDest} && shx rm package-lock.json`,
          build: generateBuildCmd(buildDest, dependencies),
        },
      },
      { ifFieldIsMissing: 'skip' },
    );
  }
}

function generateBuildCmd(buildDest, dependencies) {
  const mkDir = `shx mkdir ${buildDest}`;
  const cpPackage = `shx cp package.json ${buildDest}`;
  const cpSrc = `shx cp -r ./src ${buildDest}`;

  const build = `${mkDir} && ${cpPackage} && ${cpSrc}`;

  if (Object.keys(dependencies).length === 0) {
    return build;
  }

  const cpNodeModules = `shx cp -r ./node_modules ${buildDest}`;
  return `${build} && ${cpNodeModules}`;
}

function stripKoopDeps(dependencies) {
  return Object.entries(dependencies)
    .filter(([key]) => {
      return !/^@koopjs/.test(key);
    })
    .reduce((acc, cur) => {
      const [key, value] = cur;
      acc[key] = value;
      return acc;
    }, {});
}

async function deleteNonEssentialFiles() {
  console.log('- deleting nonessential files');
  await deleteAsync([
    'packages/**/*.*',
    '!packages/**',
    '!packages/**/src',
    '!packages/**/src/**',
    '!packages/**/package.json',
    '!packages/**/LICENSE',
  ]);
  await deleteAsync([
    'packages/**/test',
    'packages/**/.nycrc',
    'packages/**/*.svg',
    'packages/**/*.md',
    'packages/**/*.ts',
    'packages/**/*.spec.js',
  ]);

  await deleteAsync(['.github/workflows/*.yml']);
  return deleteAsync(['packages/**/benchmark']);
}

async function copyGithubAction() {
  console.log('- copying github action');
  await fs.ensureDir('.github/workflows/');
  return fs.copyFile('fork-scripts/branch-ci-tests.yml', '.github/workflows/branch-ci-tests.yml');
}

async function replacePackageReferences() {
  console.log(
    '- replacing references to monorepo packages with relative paths',
  );
  for (let i = 0; i < packages.length; i++) {
    const found = await findInFiles.find(
      /@koopjs\/[a-z-]+/,
      path.join(packages[i]),
      '.js$',
    );

    Object.entries(found).forEach(([filePathForReplacement, { matches }]) => {
      const targetPackages = matches.map((referencedPackage) => {
        return referencedPackage.replace('@koopjs/', 'packages/');
      });

      const from = path.join(
        __dirname,
        '..',
        path.dirname(filePathForReplacement),
      );

      targetPackages.forEach((targetPackage, j) => {
        const to = path.join(__dirname, '..', targetPackage);
        const relPath = path.relative(from, to);

        replace({
          regex: matches[j],
          replacement: relPath,
          paths: [filePathForReplacement],
          recursive: false,
          silent: false,
        });
      });
    });
  }
}

async function replaceKoopCoreRefs() {
  console.log('- replacing koop-core references in demo and e2e test files');
  const directories = ['test', 'demo'];
  for (let i = 0; i < directories.length; i++) {
    const found = await findInFiles.find(
      '@koopjs/koop-core',
      path.join(directories[i]),
      '.js$',
    );

    Object.entries(found).forEach(([filePathForReplacement, { matches }]) => {
      const targetPackages = matches.map((referencedPackage) => {
        return referencedPackage.replace('@koopjs/koop-core', 'packages/core');
      });

      const from = path.join(
        __dirname,
        '..',
        path.dirname(filePathForReplacement),
      );

      targetPackages.forEach((targetPackage, j) => {
        const to = path.join(__dirname, '..', targetPackage);
        const relPath = path.relative(from, to);

        replace({
          regex: matches[j],
          replacement: relPath,
          paths: [filePathForReplacement],
          recursive: false,
          silent: false,
        });
      });
    });
  }
}

execute()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
