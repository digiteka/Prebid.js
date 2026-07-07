# Prebid.js


## Configuration spécifique Digiteka

### 1. Fonctionnement du process Prebid

![alt text][logo-pbjs]

[logo-pbjs]: ./Workflow-Prebid.jpg "Workflow Prebid"

### 2. Montée de version de la librairie : 

* `git checkout master` <br>
* `git pull master` <br>
* `git checkout all_versions` -> Branche stockant toutes les versions de Prebid JS, ne pas la modifier ni la détruire <br>
* `git pull git@github.com:prebid/Prebid.js.git --tags` -> Téléchargement de toutes les versions officielles disponibles <br>
* `git checkout XXX` -> XXX = n° de tag officiel d’une branche de Prebid à cibler, ex: 2.1.0 <br>
* `git checkout -b YYY` -> YYY = Création d’une nouvelle branche Digiteka avec le n° de la nouvelle version à utiliser (ex: 2.1) <br>
* `git merge master` -> Récupération des configurations spécifiques à Digiteka déjà présentes en prod<br>
* `git push --set-upstream origin YYY` -> La branche Digiteka sera automatiquement chargée sur [Amplify](https://eu-west-1.console.aws.amazon.com/amplify/apps/dnd6gr8veismm/overview)
* Effectuer une PR sur Github en direction du repository Digiteka et non Prebid.org

![alt text][logo-dtk]

[logo-dtk]: ./GitFlow-Digiteka.jpg "Gitflow Digiteka"

### 3. Mise en production

* Vérifier la présence de `globalVarName: "pbjsDtk"` dans **Prebid/package.json**<br>
* Pour un nouveau bidder à ajouter: màj de **Prebid/modules.json** + Player/Prebid:gvlIds<br>
* S'assurer que `getVastXml()` dans **Prebid/videoCache.js** contient encore les modificiations Digiteka

Une fois le déploiement terminé, le fichier sera accessible sur
[https://[nom-de-la-branche].dnd6gr8veismm.amplifyapp.com/build/dist/pbLibrary.js](https://[nom-de-la-branche].dnd6gr8veismm.amplifyapp.com/build/dist/pbLibrary.js)

* Merger la branche sur master<br>
* [Attendre que le build soit fait sur Amplify](https://eu-west-1.console.aws.amazon.com/amplify/apps/dnd6gr8veismm/branches/master/deployments)<br>
* [Récupérer le fichier pbLibrary.js](https://master.dnd6gr8veismm.amplifyapp.com/build/dist/pbLibrary.js)<br>
* L’uploader sur [Amazon S3](https://s3.console.aws.amazon.com/s3/buckets/s3-static.outstream.digiteka.com?region=eu-west-1) **en public** (Autorisation > Liste de contrôle d'accès)<br>
* Modifier la version sur [CHEF](https://github.com/digiteka/dgchef/blob/master-ubuntu-1804/cookbooks/ultimedia/templates/default/services.yaml.erb)<br>
`prebidVersion: XXX` (l.13) (Numéro de version de Prebid si MAJ, sinon, version mineure (ex : 6.22.1) en cas d’ajout simple de module/adapter)
* MEP dans le vide de la Delivery

---

## Configuration générale Prebid

> A free and open source library for publishers to quickly implement header bidding.

This README is for developers who want to contribute to Prebid.js.
Additional documentation can be found at [the Prebid.js documentation homepage](https://docs.prebid.org/prebid/prebidjs.html).
Working examples can be found in [the developer docs](https://prebid.org/dev-docs/getting-started.html).


**Table of Contents**

- [Usage](#Usage)
- [Install](#Install)
- [Build](#Build)
- [Run](#Run)
- [Contribute](#Contribute)

<a id="customize-options"></a>

### Customize build options

Prebid.js allows you to set the following build options:

| Name | Type | Description | Default | 
| ---- | ---- | ----------- | ------- |
| globalVarName | String | Prebid global variable name | `"pbjs"` | 
| defineGlobal | Boolean | If false, do not set a global variable | `true` | 
| distUrlBase |  String | Base URL to use for dynamically loaded modules (e.g. debugging-standalone.js) | `"https://cdn.jsdelivr.net/npm/prebid.js/dist/chunks/"` |

These options can be customized via the webpack loader or the Rollup-compatible plugin.
For details and examples, see [Customize build options](customize/README.md).

<a name="Install"></a>

## Install



    $ git clone https://github.com/prebid/Prebid.js.git
    $ cd Prebid.js
    $ npm ci

*Note:* You need to have `NodeJS` 12.16.1 or greater installed.

*Note:* In the 1.24.0 release of Prebid.js we have transitioned to using gulp 4.0 from using gulp 3.9.1.  To comply with gulp's recommended setup for 4.0, you'll need to have `gulp-cli` installed globally prior to running the general `npm ci`.  This shouldn't impact any other projects you may work on that use an earlier version of gulp in its setup.

If you have a previous version of `gulp` installed globally, you'll need to remove it before installing `gulp-cli`.  You can check if this is installed by running `gulp -v` and seeing the version that's listed in the `CLI` field of the output.  If you have the `gulp` package installed globally, it's likely the same version that you'll see in the `Local` field.  If you already have `gulp-cli` installed, it should be a lower major version (it's at version `2.0.1` at the time of the transition).

To remove the old package, you can use the command: `npm rm gulp -g`

Once setup, run the following command to globally install the `gulp-cli` package: `npm install gulp-cli -g`


<a name="Build"></a>

## Build for Development

To build the project on your local machine we recommend, running:

    $ gulp serve-and-test --file <spec_file.js>

This will run testing but not linting. A web server will start at `http://localhost:9999` serving from the project root and generates the following files:

+ `./build/dev/prebid.js` - Full source code for dev and debug
+ `./build/dev/prebid.js.map` - Source map for dev and debug
+ `./build/dev/prebid-core.js`
+ `./build/dev/prebid-core.js.map`


Development may be a bit slower but if you prefer linting and additional watch files you can also still run just:

    $ gulp serve


### Build Optimization

The standard build output contains all the available modules from within the `modules` folder.  Note, however that there are bid adapters which support multiple bidders through aliases, so if you don't see a file in modules for a bid adapter, you may need to grep the repository to find the name of the module you need to include.

You might want to exclude some/most of them from the final bundle.  To make sure the build only includes the modules you want, you can specify the modules to be included with the `--modules` CLI argument.

For example, when running the serve command: `gulp serve --modules=openxBidAdapter,rubiconBidAdapter,sovrnBidAdapter`

Building with just these adapters will result in a smaller bundle which should allow your pages to load faster.

**Build standalone prebid.js**

- Clone the repo, run `npm ci`
- Then run the build:

        $ gulp build --modules=openxBidAdapter,rubiconBidAdapter,sovrnBidAdapter

Alternatively, a `.json` file can be specified that contains a list of modules you would like to include.

    $ gulp build --modules=modules.json

With `modules.json` containing the following
```json modules.json
[
  "openxBidAdapter",
  "rubiconBidAdapter",
  "sovrnBidAdapter"
]
```





## Unminified code

You can get a version of the code that's unminified for debugging with `build-bundle-dev`:

```bash
gulp build-bundle-dev --modules=bidderA,module1,...
```

The results will be in build/dev/prebid.js.

## ES5 Output Support

For compatibility with older parsers or environments that require ES5 syntax, you can generate ES5-compatible output using the `--ES5` flag:

```bash
gulp build-bundle-dev --modules=bidderA,module1,... --ES5
```

This will:
- Transpile all code to ES5 syntax using CommonJS modules
- Target browsers: IE11+, Chrome 50+, Firefox 50+, Safari 10+
- Ensure compatibility with older JavaScript parsers

**Note:** Without the `--ES5` flag, the build will use modern ES6+ syntax by default for better performance and smaller bundle sizes.

## Test locally

To lint the code:

```bash
gulp lint
```

To lint and only show errors

```bash
gulp lint --no-lint-warnings
```

To run the unit tests:

```bash
gulp test
```

To run the unit tests for a particular file (example for pubmaticBidAdapter_spec.js):
```bash
gulp test --file "test/spec/modules/pubmaticBidAdapter_spec.js" --nolint
```

To generate and view the code coverage reports:

```bash
gulp test-coverage
gulp view-coverage
```

Local end-to-end testing can be done with:

```bash
gulp e2e-test --local
```

For Prebid.org members with access to BrowserStack, additional end-to-end testing can be done with:

```bash
gulp e2e-test --host=test.localhost
```

To run these tests, the following items are required:
- setup an alias of localhost in your `hosts` file (eg `127.0.0.1  test.localhost`); note - you can use any alias.  Use this alias in the command-line argument above.
- access to [BrowserStack](https://www.browserstack.com/) account.  Assign the following variables in your bash_profile:
```bash
export BROWSERSTACK_USERNAME='YourUserNameHere'
export BROWSERSTACK_ACCESS_KEY='YourAccessKeyHere'
```
You can get these BrowserStack values from your profile page.

For development:

```javascript
(function() {
    var d = document, pbs = d.createElement('script'), pro = d.location.protocol;
    pbs.type = 'text/javascript';
    pbs.src = ((pro === 'https:') ? 'https' : 'http') + './build/dev/prebid.js';
    var target = document.getElementsByTagName('head')[0];
    target.insertBefore(pbs, target.firstChild);
})();
```

For deployment:

```javascript
(function() {
    var d = document, pbs = d.createElement('script'), pro = d.location.protocol;
    pbs.type = 'text/javascript';
    pbs.src = ((pro === 'https:') ? 'https' : 'http') + './build/dist/prebid.js';
    var target = document.getElementsByTagName('head')[0];
    target.insertBefore(pbs, target.firstChild);
})();
```

Build and run the project locally with:

```bash
gulp serve
```

This runs `lint` and `test`, then starts a web server at `http://localhost:9999` serving from the project root.
Navigate to your example implementation to test, and if your `prebid.js` file is sourced from the `./build/dev`
directory you will have sourcemaps available in your browser's developer tools.

To run the example file, go to:

+ `http://localhost:9999/integrationExamples/gpt/hello_world.html`

As you make code changes, the bundles will be rebuilt and the page reloaded automatically.




### Unit Testing with Karma

        $ gulp test --watch --browsers=chrome

This will run tests and keep the Karma test browser open. If your `prebid.js` file is sourced from the `./build/dev` directory you will also have sourcemaps available when using your browser's developer tools.

+ To access the Karma debug page, go to `http://localhost:9876/debug.html`

+ For test results, see the console

+ To set breakpoints in source code, see the developer tools

Detailed code coverage reporting can be generated explicitly with

        $ gulp test --coverage

The results will be in

        ./build/coverage

*Note*: Starting in June 2016, all pull requests to Prebid.js need to include tests with greater than 80% code coverage before they can be merged.  For more information, see [#421](https://github.com/prebid/Prebid.js/issues/421).

For instructions on writing tests for Prebid.js, see [Testing Prebid.js](https://prebid.org/dev-docs/testing-prebid.html).

### Supported Browsers

Prebid.js is supported on IE11 and modern browsers until 5.x. 6.x+ transpiles to target >0.25%; not dead. 11.21+ removes not dead and adds not ios_saf 11.

### Governance
Review our governance model [here](https://github.com/prebid/Prebid.js/tree/master/governance.md).
### END
