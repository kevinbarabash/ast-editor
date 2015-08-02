let findPropName = function(parent, node) {
    if (["BinaryExpression", "AssignmentExpression"].indexOf(parent.type) !== -1) {
        if (parent.right === node) {
            return "right";
        }
        if (parent.left === node) {
            return "left";
        }
    } else if (parent.type === "VariableDeclarator") {
        if (parent.id === node) {
            return "id";
        }
        if (parent.init === node) {
            return "init";
        }
    } else if (parent.type === "MemberExpression") {
        if (parent.object === node) {
            return "object";
        }
        if (parent.property === node) {
            return "property";
        }
    } else if (["ExpressionStatement", "Parentheses"].indexOf(parent.type) !== -1) {
        return "expression";
    }
};


let cursorNode = null;
let cursorParentNode = null;
let cursorStatementNode = null;
let cursorStatementParentNode = null;

function _findNode(node, parent, line, column) {
    if (node.loc) {
        let { start, end } = node.loc;
        let cursorAfterStart = line > start.line ||
            (line === start.line && column >= start.column);
        let cursorBeforeEnd = line < end.line ||
            (line === end.line && column <= end.column);
        if (cursorAfterStart && cursorBeforeEnd) {
            cursorNode = node;
            cursorParentNode = parent;
            if (/Statement|Declaration/.test(node.type)) {
                cursorStatementNode = node;
                cursorStatementParentNode = parent;
            }
            for (let key of Object.keys(node)) {
                if (key === "type") {
                    continue;
                }
                if (key === "loc") {
                    continue;
                }
                if (!node.hasOwnProperty(key)) {
                    continue;
                }
                let value = node[key];
                if (value === null) {
                    continue;
                }
                if (Array.isArray(value)) {
                    for (let child of value) {
                        _findNode(child, node, line, column);
                    }
                }
                _findNode(value, node, line, column);
            }
        }
    }
}

function findNode(root, line, column) {
    cursorNode = null;
    cursorParentNode = null;
    
    _findNode(root, null, line, column);
    
    return { cursorNode, cursorParentNode, cursorStatementNode, cursorStatementParentNode };
}

let path = null;

function _findNodePath(node, line, column) {
    if (node.loc) {
        let { start, end } = node.loc;
        let cursorAfterStart = line > start.line ||
            (line === start.line && column >= start.column);
        let cursorBeforeEnd = line < end.line ||
            (line === end.line && column <= end.column);
        if (cursorAfterStart && cursorBeforeEnd) {
            path.push(node);
            for (let key of Object.keys(node)) {
                if (key === "type") {
                    continue;
                }
                if (key === "loc") {
                    continue;
                }
                if (!node.hasOwnProperty(key)) {
                    continue;
                }
                let value = node[key];
                if (value === null) {
                    continue;
                }
                if (Array.isArray(value)) {
                    for (let child of value) {
                        _findNodePath(child, line, column);
                    }
                }
                _findNodePath(value, line, column);
            }
        }
    }
}

function findNodePath(root, line, column) {
    path = [];
    
    _findNodePath(root, line, column);
    
    return path;
}

module.exports = {
    findNode, findPropName, findNodePath
};
