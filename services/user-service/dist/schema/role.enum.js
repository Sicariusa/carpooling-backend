"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Role = void 0;
const graphql_1 = require("@nestjs/graphql");
var Role;
(function (Role) {
    Role["PASSENGER"] = "PASSENGER";
    Role["DRIVER"] = "DRIVER";
    Role["ADMIN"] = "ADMIN";
})(Role || (exports.Role = Role = {}));
(0, graphql_1.registerEnumType)(Role, {
    name: 'Role',
    description: 'User roles',
});
//# sourceMappingURL=role.enum.js.map