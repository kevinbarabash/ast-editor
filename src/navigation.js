let { findNode, findPropName } = require("./node_utils.js");

let left = function(path, row, column, setCursor) {
    let cursorNode = path[path.length - 1];
    let cursorParentNode = path[path.length - 2];

    if (["Literal", "Identifier", "Parentheses", "StringLiteral"].indexOf(cursorNode.type) !== -1) {
        if (cursorNode.loc.start.column <= column - 1) {
            column -= 1;
            setCursor(row, column);
            return;
        }
    }
    
    // enter from the right
    if (cursorNode.type === "CallExpression") {
        if (cursorNode.loc.end.column === column) {
            column -= 1;
            setCursor(row, column);
            return;
        }
    }

    for (let i = path.length - 1; i > 0; i--) {
        let node = path[i];
        let parent = path[i - 1];

        let propName = findPropName(parent, node);

        if (propName === "right") {
            let loc = parent.left.loc;
            row = loc.end.line - 1;
            column = loc.end.column + 1;
            setCursor(row, column, true);
            hideCursor();
            break;
        } else if (propName === "init") {
            // TODO: check the type, if it's a placeholder then we need to select it
            let loc = parent.id.loc;
            row = loc.end.line - 1;
            column = loc.end.column;
            setCursor(row, column);
            break;
        } else if (propName === "property") {
            let loc = parent.object.loc;
            row = loc.end.line - 1;
            column = loc.end.column;
            setCursor(row, column);
            break;
        }
    }
    
    if (["BinaryExpression", "AssignmentExpression"].indexOf(cursorNode.type) !== -1) {
        column = cursorNode.left.loc.end.column;
        setCursor(row, column);
        return;
    }
    
    if (cursorParentNode.type === "ArrayExpression") {
        let elements = cursorParentNode.elements;
        let idx = elements.findIndex(element => cursorNode === element);

        if (idx > 0) {
            cursorNode = cursorParentNode.elements[idx - 1];
            column = cursorNode.loc.end.column; // assume same row
            setCursor(row, column);
        }
        return;
    }

    if (cursorParentNode.type === "FunctionExpression") {
        let params = cursorParentNode.params;
        let idx = params.findIndex(param => cursorNode === param);

        if (idx > 0) {
            cursorNode = cursorParentNode.params[idx - 1];
            column = cursorNode.loc.end.column; // assume same row
            setCursor(row, column);
        }
    }

    if (cursorParentNode.type === "CallExpression") {
        let args = cursorParentNode.arguments;
        let idx = args.findIndex(arg => cursorNode === arg);

        if (idx > 0) {
            cursorNode = cursorParentNode.arguments[idx - 1];
            column = cursorNode.loc.end.column; // assume same row
            setCursor(row, column);
        }
    }

    let nodes = findNode(prog, row + 1, column - 1);
    // we use cursorParentNode here because the identifier for the CallExpression
    // is smushed right up against the '(' so it's impossible to find it unless
    // we changed the the findNode method
    // TODO investigate adding an option to findNode to change whether the ranges are inclusive or not
    if (["CallExpression"].indexOf(nodes.cursorParentNode.type) !== -1) {
        column -= 1;
        setCursor(row, column);
        return;
    }
};

let right = function(path, row, column, setCursor, prog) {
    let cursorNode = path[path.length - 1];
    let cursorParentNode = path[path.length - 2];

    if (["Literal", "Identifier", "Parentheses", "StringLiteral"].indexOf(cursorNode.type) !== -1) {
        if (column + 1 <= cursorNode.loc.end.column) {
            column += 1;
            setCursor(row, column);
            return;
        }
    }

    for (let i = path.length - 1; i > 0; i--) {
        let node = path[i];
        let parent = path[i-1];

        let propName = findPropName(parent, node);

        if (propName === "left") {
            let loc = parent.left.loc;
            row = loc.end.line - 1;
            column = loc.end.column + 1;
            setCursor(row, column, true);
            hideCursor();
            break;
        } else if (propName === "id" && cursorParentNode.type === "VariableDeclarator") {
            column += 3;
            setCursor(row, column);
            //hideCursor();
            // TODO: check the type, e.g. PlaceHolder

            break;
        } else if (propName === "object") {
            let loc = parent.property.loc;
            row = loc.end.line - 1;
            column = loc.start.column;
            setCursor(row, column);
            break;
        }
    }

    if (["BinaryExpression", "AssignmentExpression"].indexOf(cursorNode.type) !== -1) {
        column = cursorNode.right.loc.start.column;
        setCursor(row, column);
        return;
    }

    if (cursorParentNode.type === "ArrayExpression") {
        let elements = cursorParentNode.elements;
        let idx = elements.findIndex(element => cursorNode === element);

        if (idx < elements.length - 1) {
            cursorNode = cursorParentNode.elements[idx + 1];
            column = cursorNode.loc.start.column; // assume same row
            setCursor(row, column);
        }
        return;
    }
    
    if (cursorParentNode.type === "FunctionExpression") {
        let params = cursorParentNode.params;
        let idx = params.findIndex(param => cursorNode === param);
        
        if (idx < params.length - 1) {
            cursorNode = cursorParentNode.params[idx + 1];
            column = cursorNode.loc.start.column; // assume same row
            setCursor(row, column);
        }
    }

    if (cursorParentNode.type === "CallExpression") {
        let args = cursorParentNode.arguments;
        let idx = args.findIndex(arg => cursorNode === arg);

        if (idx < args.length - 1) {
            cursorNode = cursorParentNode.arguments[idx + 1];
            column = cursorNode.loc.start.column; // assume same row
            setCursor(row, column);
        }
    }

    let nodes = findNode(prog, row + 1, column + 1);
    if (["Parentheses", "CallExpression"].indexOf(nodes.cursorNode.type) !== -1) {
        column += 1;
        setCursor(row, column);
        return;
    }
};

module.exports = {
    left, right
};
