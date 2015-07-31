var indent = "    ";
var line, column, indentLevel;

function renderAST(node) {
    line = 1;
    column = 0;
    indentLevel = 0;
    return render(node);
}

function render(node) {
    if (node.type === "VariableDeclaration") {
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
        return result + ";";
    } else if (node.type === "VariableDeclarator") {
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
    } else if (node.type === "Identifier") {
        node.loc = {};
        node.loc.start = { line, column };
        column += node.name.length;
        node.loc.end = { line, column };
        return node.name;
    } else if (node.type === "Placeholder") {
        node.loc = {};
        node.loc.start = { line, column };
        column += 1;    // "?".length
        node.loc.end = { line, column };
        return "?";
    } else if (node.type === "BlankStatement") {
        node.loc = {
            start: { line, column },
            end: { line, column }
        };
        return "";
    } else if (node.type === "ForOfStatement") {
        node.loc = {};
        node.loc.start = { line, column };

        let result = "for (";
        column += 5;    // "for (".length

        result += render(node.left);
        result += " of ";
        column += 4;    // " of ".length
        result += render(node.right);
        result += ") {\n";

        indentLevel += 1;
        column += indentLevel * indent.length;
        line += 1;
        result += render(node.body);
        indentLevel -= 1;

        result += indent.repeat(indentLevel) + "}";

        node.loc.end = { line, column };

        return result;
    } else if (node.type === "ArrayExpression") {
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
    } else if (node.type === "Literal") {
        node.loc = {};
        node.loc.start = { line, column };
        if (node.raw) {
            column += String(node.raw).length;
        } else {
            column += String(node.value).length;
        }
        node.loc.end = { line, column };

        return node.raw ? node.raw : node.value;
    } else if (node.type === "BlockStatement") {
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

        return children.join("\n") + "\n";
    } else if (node.type === "ExpressionStatement") {
        let expr = render(node.expression);

        node.loc = {
            start: node.expression.loc.start,
            end: node.expression.loc.end
        };

        return expr + ";";
    } else if (node.type === "AssignmentExpression") {
        let left = render(node.left);
        column += 3;    // " = ".length;
        let right = render(node.right);

        node.loc = {
            start: node.left.loc.start,
            end: node.right.loc.end
        };

        return `${left} = ${right}`;
    } else if (node.type === "ReturnStatement") {
        node.loc = {};
        node.loc.start = { line, column };

        column += 7;    // "return ".length
        let arg = render(node.argument);

        node.loc.end = node.argument.loc.end;

        return `return ${arg};`;
    } else if (node.type === "Program") {
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
    } else if (node.type === "LineComment") {
        node.loc = {};
        node.loc.start = { line, column };
        let result = "// " + node.content;
        column += result.length;
        node.loc.end = { line, column };
        return result;
    } else if (node.type === "BlockComment") {
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
    } else if (node.type === "BinaryExpression") {
        let left = render(node.left);
        column += 3;    // e.g. " + ".length;
        let right = render(node.right);

        node.loc = {
            start: node.left.loc.start,
            end: node.right.loc.end
        };

        return `${left} ${node.operator} ${right}`;
    } else if (node.type === "Parentheses") {
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
    }
}

module.exports = {
    renderAST: renderAST
};