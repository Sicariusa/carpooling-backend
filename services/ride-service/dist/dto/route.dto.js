"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateRouteInput = exports.CreateRouteInput = exports.CreateRouteStopInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
let CreateRouteStopInput = class CreateRouteStopInput {
};
exports.CreateRouteStopInput = CreateRouteStopInput;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRouteStopInput.prototype, "stopId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int, { nullable: true }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateRouteStopInput.prototype, "sequence", void 0);
exports.CreateRouteStopInput = CreateRouteStopInput = __decorate([
    (0, graphql_1.InputType)()
], CreateRouteStopInput);
let CreateRouteInput = class CreateRouteInput {
};
exports.CreateRouteInput = CreateRouteInput;
__decorate([
    (0, graphql_1.Field)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRouteInput.prototype, "name", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRouteInput.prototype, "description", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateRouteInput.prototype, "totalDistance", void 0);
__decorate([
    (0, graphql_1.Field)(() => [CreateRouteStopInput]),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateRouteStopInput),
    __metadata("design:type", Array)
], CreateRouteInput.prototype, "stops", void 0);
exports.CreateRouteInput = CreateRouteInput = __decorate([
    (0, graphql_1.InputType)()
], CreateRouteInput);
let UpdateRouteInput = class UpdateRouteInput {
};
exports.UpdateRouteInput = UpdateRouteInput;
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateRouteInput.prototype, "name", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateRouteInput.prototype, "description", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float, { nullable: true }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateRouteInput.prototype, "totalDistance", void 0);
__decorate([
    (0, graphql_1.Field)(() => [CreateRouteStopInput], { nullable: true }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CreateRouteStopInput),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdateRouteInput.prototype, "stops", void 0);
__decorate([
    (0, graphql_1.Field)(() => Boolean, { nullable: true }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateRouteInput.prototype, "isActive", void 0);
exports.UpdateRouteInput = UpdateRouteInput = __decorate([
    (0, graphql_1.InputType)()
], UpdateRouteInput);
//# sourceMappingURL=route.dto.js.map