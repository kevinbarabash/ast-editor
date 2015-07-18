var indent = "    ";
var line = 1;
var column = 0;
var indentLevel = 0;


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

        node.loc.end = { line, column }
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
        console.log(node);
        return node.name;
    } else if (node.type === "Placeholder") {
        node.loc = {};
        node.loc.start = { line, column };
        column += 1;    // "?".length
        node.loc.end = { line, column };
        return "?";
    } else if (node.type === "Blankline") {
        return "";
    } else if (node.type === "ForOfStatement") {
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
        column += node.value.length;
        node.loc.end = { line, column };

        console.log(node);

        return node.value;
    } else if (node.type === "BlockStatement") {
        return node.body.map(statement => {
            column = indentLevel * indent.length;
            console.log(`line = ${line}, column = ${column}`);
            let result = indent.repeat(indentLevel) + render(statement);
            line += 1;
            return result;
        }).join("\n") + "\n";
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
        column += 7;    // "return ".length
        let arg = render(node.argument);

        node.loc = {
            start: { line, column },
            end: node.argument.loc.end
        };

        return `return ${arg};`;
    } else if (node.type === "Program") {
        // TODO: unify this with "BlockStatement" which has the same code
        return node.body.map(statement => {
            column = indentLevel * indent.length;
            console.log(`line = ${line}, column = ${column}`);
            let result = indent.repeat(indentLevel) + render(statement);
            line += 1;
            return result;
        }).join("\n") + "\n";
    }
}


var prog = {
    type: "Program",
    body: [
        {
            type: "VariableDeclaration",
            declarations: [{
                type: "VariableDeclarator",
                id: {
                    type: "Identifier",
                    name: "a"
                },
                init: {
                    type: "Placeholder"
                }
            }],
            kind: "let"
        },
        {
            type: "ForOfStatement",
            left: {
                type: "Identifier",
                name: "a"
            },
            right: {
                type: "ArrayExpression",
                elements: [
                    { type: "Literal", value: 1 },
                    { type: "Literal", value: 2 },
                    { type: "Literal", value: 3 },
                    { type: "Placeholder" }
                ]
            },
            body: {
                type: "BlockStatement",
                body: [
                    {
                        type: "ExpressionStatement",
                        expression: {
                            type: "AssignmentExpression",
                            left: {
                                type: "Identifier",
                                name: "b"
                            },
                            right: {
                                type: "Placeholder"
                            }
                        }
                    },
                    { type: "Blankline" },
                    {
                        type: "ReturnStatement",
                        argument: {
                            type: "Identifier",
                            name: "b"
                        }
                    }
                ]
            }
        }
    ]
};

//console.log(render(forOf));

line = 1;
column = 0;
editor.getSession().setValue(render(prog));
