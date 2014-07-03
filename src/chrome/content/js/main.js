
(function(){

    var helloWorld = require("./helloworld");

    var Cc = Components.classes;
    var Ci = Components.interfaces;

    var consoleService = Cc["@mozilla.org/consoleservice;1"]
        .getService(Ci.nsIConsoleService);

    var label = document.querySelector("#helloWorldLabel");
    var button = document.querySelector("#testButton");


    button.onclick = function(){
        label.textContent="say:" + helloWorld();
    }


})();