
const parser = require('@solidity-parser/parser');

const input = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SecureVault {
    address public owner;
    mapping(address => uint256) private _balances;

    event Deposited(address indexed user, uint256 amount);

    function deposit() public payable {
        _balances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
}
`;

try {
    const ast = parser.parse(input);
    parser.visit(ast, {
        FunctionDefinition: (node) => {
            console.log('Function:', node.name);
            parser.visit(node, {
                EmitStatement: (emitNode) => {
                    console.log('  Found EmitStatement');
                },
                ExpressionStatement: (exprNode) => {
                    console.log('  Found ExpressionStatement:', exprNode.expression.type);
                    if (exprNode.expression.type === 'Assignment') {
                        console.log('    Assignment op:', exprNode.expression.operator);
                    }
                }
            });
        }
    });
} catch (e) {
    console.error(e);
}
