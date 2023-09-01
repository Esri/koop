# Koop Fork

This is a specialized fork of the Koop repositiory.

## Syncing with master
This fork has some simple modifications that include:
- edited README.md
- removed Github Actions releated to Koop releases, dependabot, and code scanning
- script to automate the above changes
- script to automate changes for CDF branch modifications

## Creating a CDF release branch
1. Make sure your master branch is synchronized with the Koop upstream.  This may require a rebase due to the changes made on this fork.

2. Branch off of synced master.  In this example we call the branch cdf-next:

```bash
> git checkout -b cdf-next
```

3. Run modification script.  This will result in file deletions, modifications, and the creation of a Github Action.
```bash
> node fork-scripts/modify-branch-for-cdf.js && npm install
```

4. Run E2E tests and ensure they all pass
```bash
> npm run test:e2e
```

5. Commit changes and push your branch
```bash
> git commit -m 'chore: prep for cdf release'
> git push origin cdf-next
```

6.  Consider adding branch protection rules on Github (to prevent deletions).

## License

[Apache 2.0](LICENSE)

<!-- [](Esri Tags: ArcGIS Web Mapping GeoJson FeatureServices) -->
<!-- [](Esri Language: JavaScript) -->

