var indent = "    ";
var count = 0;

// TODO:
// TODO: add position information as we render

function render(node) {
    if (node.type === "VariableDeclaration") {
        return node.kind + " " + node.declarations.map(decl => render(decl)).join(", ") + ";\n"
    } else if (node.type === "VariableDeclarator") {
        if (node.init) {
            return render(node.id) + " = " + render(node.init);
        } else {
            return render(node.id);
        }
    } else if (node.type === "Identifier") {
        return node.name;
    } else if (node.type === "Placeholder") {
        return "?";
    } else if (node.type === "Blankline") {
        return "";
    } else if (node.type === "ForOfStatement") {
        count += 1;
        var result = "for (" + render(node.left) + " of " + render(node.right) + ") {\n" +
            render(node.body) + "\n" + "}\n";
        count -= 1;
        return result;
    } else if (node.type === "ArrayExpression") {
        return "[" + node.elements.map(element => render(element)).join(", ") + "]";
    } else if (node.type === "Literal") {
        return node.value;
    } else if (node.type === "BlockStatement") {
        return node.body.map(statement => indent + render(statement)).join("\n");
    } else if (node.type === "ExpressionStatement") {
        return render(node.expression) + ";";
    } else if (node.type === "AssignmentExpression") {
        return render(node.left) + " = " + render(node.right);
    } else if (node.type === "ReturnStatement") {
        return "return " + render(node.argument) + ";";
    }
}


var declaration = {
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
};

console.log(render(declaration));

var forOf = {
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
};

console.log(render(forOf));
