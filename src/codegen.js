let EventEmitter = require("events").EventEmitter;

let astWatcher = new EventEmitter();

let indent = "    ";
let line, column, indentLevel, placeholderCount;

function renderAST(node) {
    line = 1;
    column = 0;
    indentLevel = 0;
    placeholderCount = 0;
    let result = render(node);
    
    if (placeholderCount === 0) {
        astWatcher.emit("run", result);
    }
    
    return result;
}

let renderer = {
    VariableDeclaration(node, parent) {
        node.loc = {};
        node.loc.start = { line, column };
        let result = node.kind;
        result += " ";
        column += node.kind.length + 1;     // node.kind.length + " ".length

        node.declarations.forEach((decl, index) => {
            if (index > 0) {
                result += ", ";
                column += 2;    // ", ".length
            }
            result += render(decl);
        });

        node.loc.end = { line, column };
        
        if (parent && parent.type === "ForOfStatement") {
            return result;
        } else {
            return result + ";";
        }
    },
    VariableDeclarator(node) {
        if (node.init) {
            node.loc = {};
            let result = render(node.id);
            node.loc.start = node.id.loc.start;
            result += " = ";
            column += 3;    // " = ".length
            result += render(node.init);
            node.loc.end = node.init.loc.end;
            return result;
        } else {
            let result = render(node.id);
            node.loc = node.id.loc;
            return result;
        }
    },
    Identifier(node) {
        node.loc = {};
        node.loc.start = { line, column };
        column += node.name.length;
        node.loc.end = { line, column };
        return node.name;
    },
    Placeholder(node) {
        placeholderCount++;
        node.loc = {};
        node.loc.start = { line, column };
        column += 1;    // "?".length
        node.loc.end = { line, column };
        return "?";
    },
    BlankStatement(node) {
        node.loc = {
            start: { line, column },
            end: { line, column }
        };
        return "";
    }, 
    ForOfStatement(node) {
        node.loc = {};
        node.loc.start = { line, column };
    
        let result = "for (";
        column += 5;    // "for (".length
    
        result += render(node.left, node);
        result += " of ";
        column += 4;    // " of ".length
        result += render(node.right);
        result += ") ";

        result += render(node.body);

        node.loc.end = { line, column };
    
        return result;
    },
    ArrayExpression(node) {
        node.loc = {};
        node.loc.start = { line, column };
    
        let result = "[";
        column += 1;
    
        node.elements.forEach((element, index) => {
            if (index > 0) {
                result += ", ";
                column += 2;    // ", ".length
            }
            result += render(element);
        });
    
        result += "]";
        column += 1;
    
        node.loc.end = { line, column };
    
        return result;
    },
    Literal(node) {
        node.loc = {};
        node.loc.start = { line, column };
        if (node.raw) {
            column += String(node.raw).length;
        } else {
            column += String(node.value).length;
        }
        node.loc.end = { line, column };
    
        return node.raw ? node.raw : node.value;
    },
    BlockStatement(node) {
        let result = "{\n";

        indentLevel += 1;
        column += indentLevel * indent.length;
        line += 1;
        
        let children = node.body.map(statement => {
            column = indentLevel * indent.length;
            let result = indent.repeat(indentLevel) + render(statement);
            line += 1;
            return result;
        });
    
        // TODO guarantee that there's always one child
        let first = node.body[0];
        let last = node.body[children.length - 1];
    
        node.loc = {};
        node.loc.start = first.loc.start;
        node.loc.end = last.loc.end;
    
        result += children.join("\n") + "\n";

        indentLevel -= 1;

        result += indent.repeat(indentLevel) + "}";
        
        return result;
    }, 
    ExpressionStatement(node) {
        let expr = render(node.expression);
    
        node.loc = {
            start: node.expression.loc.start,
            end: node.expression.loc.end
        };
    
        return expr + ";";
    },
    AssignmentExpression(node) {
        let left = render(node.left);
        column += 3;    // " = ".length;
        let right = render(node.right);
    
        node.loc = {
            start: node.left.loc.start,
            end: node.right.loc.end
        };
    
        return `${left} = ${right}`;
    },
    ReturnStatement(node) {
        node.loc = {};
        node.loc.start = { line, column };
    
        column += 7;    // "return ".length
        let arg = render(node.argument);
    
        node.loc.end = node.argument.loc.end;
    
        return `return ${arg};`;
    },
    Program(node) {
        // TODO: unify this with "BlockStatement" which has the same code
        node.loc = {};
        node.loc.start = { line, column };
        let result = node.body.map(statement => {
                column = indentLevel * indent.length;
                let result = indent.repeat(indentLevel) + render(statement);
                line += 1;
                return result;
            }).join("\n") + "\n";
        node.loc.end = { line, column };
        return result;
    },
    LineComment(node) {
        node.loc = {};
        node.loc.start = { line, column };
        let result = "// " + node.content;
        column += result.length;
        node.loc.end = { line, column };
        return result;
    },
    BlockComment(node) {
        // TODO: handle indent level
        node.loc = {};
        column = indent.length * indentLevel;
        node.loc.start = { line, column };
        let lines = node.content.split("\n");
        let result = "/*\n" + lines.map(line => "  " + line + "\n").join("") + " */";
        line += 1 + lines.length;   // Program or BlockStatements add another \n
        column = indent.length * indentLevel;
        node.loc.end = { line, column };
        return result;
    },
    BinaryExpression(node) {
        let left = render(node.left);
        column += 3;    // e.g. " + ".length;
        let right = render(node.right);
    
        node.loc = {
            start: node.left.loc.start,
            end: node.right.loc.end
        };
    
        return `${left} ${node.operator} ${right}`;
    },
    Parentheses(node) {
        node.loc = {};
        column += 1;    // "(".length
        let expr = render(node.expression);
        column += 1;    // ")".length
        let { start, end } = node.expression.loc;
        node.loc = {
            start: {
                line: start.line,
                column: start.column - 1
            },
            end: {
                line: end.line,
                column: end.column + 1
            }
        };
        return `(${expr})`;
    },
    ClassDeclaration(node) {
        node.loc = {};
        node.loc.start = { line, column };
        
        let result = "class ";
        column += 6;    // "class ".length
        
        // not advancing column here is okay because ClassBody (BlockStatement)
        // resets column when it advances to the first line of the body
        result += `${render(node.id)} ${render(node.body)}`;

        node.loc.end = { line, column };
    
        return result;
    },
    ClassBody(node) {
        return this.BlockStatement(node);
    }, 
    MethodDefinition(node) {
        node.loc = {};
        node.loc.start = { line, column };
        let result = render(node.key);
    
        result += "(";
        column += 1;
        node.value.params.forEach((element, index) => {
            if (index > 0) {
                result += ", ";
                column += 2;    // ", ".length
            }
            result += render(element);
        });
        result += ")";
        result += " ";
        
        result += render(node.value.body);
    
        node.loc.end = { line, column };
    
        // kind of a hack b/c there isn't a FunctionExpression rendered in the
        // the classical sense
        // TODO figure how to fix this so we can access the identifier separately
        node.value.loc = {};
        node.value.loc.start = JSON.parse(JSON.stringify(node.key.loc.end));
        node.value.loc.start.column += 1;
        node.value.loc.end = node.loc.end;
        console.log(node.value.loc);
    
        return result;
    },
    CallExpression(node) {
        node.loc = {};
        node.loc.start = { line, column };
        let result = render(node.callee);
    
        result += "(";
        column += 1;
        node.arguments.forEach((arg, index) => {
            if (index > 0) {
                result += ", ";
                column += 2;    // ", ".length
            }
            result += render(arg);
        });
        result += ")";
        column += 1;
    
        node.loc.end = { line, column };
    
        return result;
    },
    FunctionExpression(node) {
        node.loc = {};
        node.loc.start = { line, column };
    
        let result = "function (";
        column += result.length;
        node.params.forEach((element, index) => {
            if (index > 0) {
                result += ", ";
                column += 2;    // ", ".length
            }
            result += render(element);
        });
        result += ")";
        result += " ";
        
        result += render(node.body);
    
        node.loc.end = { line, column };
    
        return result;
    },
    MemberExpression(node) {
        node.loc = {};
        node.loc.start = { line, column };
    
        let result = render(node.object);
        if (node.computed) {
            result += "[";
            column += 1;
            result += render(node.property);
            result += "]";
            column += 1;
        } else {
            result += ".";
            column += 1;    // ".".length
            result += render(node.property);
        }
    
        node.loc.end = { line, column };
    
        return result;
    }, 
    IfStatement(node) {
        node.loc = {};
        node.loc.start = { line, column };
    
        let result = "if (";
        column += result.length;
    
        result += render(node.test);
        result += ") ";
        result += render(node.consequent);

        if (node.alternate) {
            result += " else {\n";
            indentLevel += 1;
            column += indentLevel * indent.length;
            line += 1;
            result += render(node.consequent);
    
            indentLevel -= 1;
            result += indent.repeat(indentLevel) + "}";
        }
    
        node.loc.end = { line, column };
    
        return result;
    },
    ThisExpression(node) {
        node.loc = {};
        node.loc.start = { line, column };
        column += 4;
        node.loc.end = { line, column };
        
        return "this";
    }
};


function render(node, parent) {
    if (renderer[node.type]) {
        return renderer[node.type](node, parent);
    } else {
        throw `${node.type} not supported yet`;
    }
}

module.exports = {
    renderAST: renderAST,
    astWatcher: astWatcher
};
