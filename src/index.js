let prog = require("./prog.js");

module.exports = {
    init: function(editor, ast) {
        ast = ast || prog;

        let editing = require("./editing.js");
        let navigation = require('./navigation.js');

        editing.init(editor, ast);
        navigation.init(editor, ast);
    }
};

// TODO: dragging to create a selection should always select nodes that make sense to replace or delete
// TODO: delete => replace with Placeholder
// TODO: figure out undo/redo on the AST
// TODO: certain nodes can be edited, e.g. Literals, Identifiers... other nodes can not
// TODO: select the whole node when it can't be edited when placing the cursor somewhere
// TODO: handle replacing the current selection
// TODO: undo/redo using either ast-path to identify nodes or use references for children in the AST
// TODO: create a custom highlight mode in ace that uses the AST to determine colors
// TODO: have ace scroll to the line it was on before we replaced everything
// TODO: don't replace everything in the ace editor
