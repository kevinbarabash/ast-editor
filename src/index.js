let { left, right } = require("./navigation.js");
let { insert, backspace, enter } = require("./editing.js");
let { findNodePath } = require("./node_utils.js");
let { renderAST } = require("./codegen.js");

let init = function(editor, ast) {
    let prog = ast || require("./prog.js");
    let session = editor.getSession();
    let selection = session.getSelection();

    session.setValue(renderAST(prog));

    let update = function(row, column) {
        session.setValue(renderAST(prog));
        selection.setSelectionRange({
            start: { row, column },
            end: { row, column }
        });
    };

    let setCursor = function(row, column, isPlaceholder) {
        if (isPlaceholder) {
            selection.setSelectionRange({
                start: { row, column },
                end: { row, column: column + 1 }
            });
        } else {
            selection.setSelectionRange({
                start: { row, column },
                end: { row, column }
            });
        }
    };

    document.addEventListener('keypress', function (e) {
        e.preventDefault();

        let c = String.fromCharCode(e.keyCode);

        let range = editor.getSelectionRange();
        let row = range.end.row;
        let column = range.end.column;

        let path = findNodePath(prog, row + 1, column);

        insert(c, path, row, column, update, prog);

    }, true);

    document.addEventListener('keydown', function (e) {
        let range = editor.getSelectionRange();
        let row = range.end.row;
        let column = range.end.column;

        let path = findNodePath(prog, row + 1, column);

        // ignore tabs
        if (e.keyCode === 9) {
            e.stopPropagation();
            e.preventDefault();
        }

        if (e.keyCode === 8) {
            e.stopPropagation();
            e.preventDefault();
            backspace(path, row, column, update, prog);
        }

        if (e.keyCode === 13) {
            e.stopPropagation();
            e.preventDefault();
            enter(path, row, column, update, prog);
        }

        if (e.keyCode === 37) {
            e.preventDefault();
            e.stopPropagation();
            left(path, row, column, setCursor, prog);
        }

        if (e.keyCode === 39) {
            e.preventDefault();
            e.stopPropagation();
            right(path, row, column, setCursor, prog);
        }
    }, true);

    document.addEventListener('keyup', function (e) {
        // prevent backspace
        if (e.keyCode === 8) {
            e.stopPropagation();
            e.preventDefault();
        }
    }, true);

    let hideCursor = function() {
        document.querySelector('.ace_cursor-layer').style.opacity = 0.0;
    };

    let showCursor = function() {
        document.querySelector('.ace_cursor-layer').style.opacity = 1.0;
    };

    selection.on("changeCursor", e => {
        setTimeout(() => {
            let range = editor.getSelectionRange();
            let line = range.start.row + 1;
            let column = range.start.column;
            let path = findNodePath(prog, line, column);

            let node1 = path[path.length - 1];

            console.log(node1);
            if (node1.type === "Placeholder") {
                let loc = node1.loc;
                let row = loc.start.line - 1;
                selection.setSelectionRange({
                    start: { row, column: loc.start.column },
                    end: { row, column: loc.end.column }
                });
                hideCursor();
            } else if (["AssignmentExpression", "BinaryExpression"].indexOf(node1.type) !== -1) {
                let loc = node1.left.loc;
                let row = loc.end.line - 1;
                let column = loc.end.column + 1;
                selection.setSelectionRange({
                    start: {
                        row: row,
                        column: column
                    },
                    end: {
                        row: row,
                        column: column + 1
                    }
                });
                hideCursor();
            } else {
                showCursor();
            }
        }, 0);
    });
};

module.exports = {
    init  
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
// TODO: disallow return statements inside of for-loop
