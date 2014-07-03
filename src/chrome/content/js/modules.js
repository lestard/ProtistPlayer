(function (global) {
    "use strict";

    var Cc = Components.classes;
    var Ci = Components.interfaces;

    var ioService = Cc['@mozilla.org/network/io-service;1']
        .getService(Components.interfaces.nsIIOService);

    var observerService = Cc["@mozilla.org/observer-service;1"]
        .getService(Ci.nsIObserverService);

    var subScriptLoader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
        .getService(Ci.mozIJSSubScriptLoader);

    var consoleService = Cc["@mozilla.org/consoleservice;1"]
        .getService(Ci.nsIConsoleService);

    var modules = [];


    /**
     * An array of paths where the require function searches for js modules.
     *
     * It's best to specify the paths as chrome URIs i.e. "chrome://<project-name>/content/js/".
     */
    var paths = [];


    /**
     * The developer mode can be handy while the development of new modules.
     *
     * When the developer mode is activated the caching of loaded modules that is done
     * by mozillas subScripLoader is disabled. Otherwise changes to a module are probably
     * not updated even when the xul file is reloaded.
     *
     * Default value is false.
     */
    var devMode = false;


    /**
     * This is an internal flag that is set to false
     * when the script cache is disabled. It is used
     * to ensure that the disabling is only done once.
     */
    var scriptCacheEnabled = true;

    /**
     * The main require method.
     */
    global.require = function (identifier) {

        if (require.devMode && scriptCacheEnabled) {
            console.log("disabling the script caching");

            observerService.notifyObservers(null, "startupcache-invalidate", null);

            scriptCacheEnabled = false;
        }

        if (!identifier) {
            throw new Error("No valid module identifier");
        }

        // according to the spec identifiers must not contain file endings.
        if (identifier.endsWith(".js")) {
            identifier = identifier.slice(0, -3);
        }



        var moduleUri;

        if (identifier.startsWith(".")) {
            var callerUri = Components.stack.caller.filename;  // The filename of the calling script
            moduleUri = resolveRelativeUri(identifier + ".js", callerUri);
        } else {
            moduleUri = resolveTopLevelModule(identifier + ".js");
        }


        if (!moduleUri) {
            throw new Error("Can't resolve the absolute uri for the module identifier [" + identifier + "]");
        }



        // when the module was already loaded, return it.
        if (modules[moduleUri]) {
            return modules[moduleUri];
        }

        var script = loadScriptFromUri(moduleUri);

        if (!script) {
            throw new Error("Can't load the module with identifier [" + identifier + "].\nThe resolved uri is [" + moduleUri + "]");
        }

        var exports = script.exports;

        modules[moduleUri] = exports;

        return exports;
    };

    require.paths = paths;
    require.devMode = devMode;


    /**
     * Resolve the absolute uri for a given relative Path and the base uri.
     *
     * @param relPath - The relative path as String.
     * @param basePath - The base path as String.
     * @returns absolute uri for the given relative path.
     */
    var resolveRelativeUri = function (relPath, basePath) {
        var baseUri = ioService.newURI(basePath, "UTF-8", null);

        if (!baseUri) {
            throw new Error("Can't find the base directory for the relative module identifier [" + relPath + "]");
        }

        return baseUri.resolve(relPath);
    };


    /**
     * Resolve the URI for a top-level identifier.
     *
     * The first place to look for top-level identifiers is
     * in the same directory where this script file (modules.js)
     * is located. This way other CommonJS modules can be loaded with
     * a high priority.
     *
     * After that the paths array is searched for a
     * URI matching the identifier.
     */
    var resolveTopLevelModule = function (identifier) {
        // get the uri of this js file
        var thisScriptsUri = Components.stack.filename;

        if (thisScriptsUri) {

            var moduleUri = resolveRelativeUri(identifier, thisScriptsUri);

            if (uriIsValid(moduleUri)) {
                return moduleUri;
            }
        }


        for (var i = 0; i < paths.length; i++) {
            var path = paths[i];

            var moduleUri = resolveRelativeUri(identifier, path);

            if (uriIsValid(moduleUri)) {
                return moduleUri;
            }
        }

        return undefined;
    };

    /**
     * Verify whether the given URI is valid and accessible.
     */
    var uriIsValid = function (uriAsString) {
        var uri = ioService.newURI(uriAsString, "UTF-8", null);

        if (!uri) {
            return false;
        }

        try {
            var channel = ioService.newChannelFromURI(uri);

            // open the channel and directly close it.
            channel.open().close();

            return true;
        } catch (exception) {
            if (exception.name == "NS_ERROR_FILE_NOT_FOUND") {
                return false;
            } else {
                throw exception;
            }
        }
    };

    /**
     * Load the js script with the given uri using mozilla's subScriptLoader.
     *
     * The scope object returned by this function contains all local
     * variables that are defined in the loaded module.
     *
     * The only global property that is returned in the scope object
     * is the "exports" property that the module defines (if any).
     *
     * When the module doesn't define a global "exports" property,
     * an empty "exports" property is added to the scope object.
     *
     * @returns an scope object with the loaded script.
     */
    var loadScriptFromUri = function (uri) {
        var scope = {
            exports: {}
        };

        try {
            subScriptLoader.loadSubScript(uri, scope);
        } catch (e) {
            return undefined;
        }

        return scope;
    };


    // if no console object is available, we define our own simple logger.
    if(!console){
        var console = {};

        console.log = function (message) {
            consoleService.logStringMessage(message);
        };
    };

})(this);
