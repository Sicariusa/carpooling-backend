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
exports.ModifyDestinationInput = exports.BookingDeadlineInput = exports.SearchRideInput = exports.UpdateRideInput = exports.CreateRideInput = exports.RideStopInput = void 0;
const graphql_1 = require("@nestjs/graphql");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const ride_schema_1 = require("../schemas/ride.schema");
let RideStopInput = class RideStopInput {
};
exports.RideStopInput = RideStopInput;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RideStopInput.prototype, "stopId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], RideStopInput.prototype, "sequence", void 0);
exports.RideStopInput = RideStopInput = __decorate([
    (0, graphql_1.InputType)()
], RideStopInput);
let CreateRideInput = class CreateRideInput {
    constructor() {
        this.priceScale = 1;
        this.girlsOnly = false;
    }
};
exports.CreateRideInput = CreateRideInput;
__decorate([
    (0, graphql_1.Field)(() => [RideStopInput]),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(2),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => RideStopInput),
    __metadata("design:type", Array)
], CreateRideInput.prototype, "stops", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, class_validator_1.IsDate)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], CreateRideInput.prototype, "departureTime", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateRideInput.prototype, "totalSeats", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateRideInput.prototype, "availableSeats", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateRideInput.prototype, "pricePerSeat", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float, { defaultValue: 1 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateRideInput.prototype, "priceScale", void 0);
__decorate([
    (0, graphql_1.Field)(() => Boolean, { defaultValue: false }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateRideInput.prototype, "girlsOnly", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRideInput.prototype, "startLocation", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRideInput.prototype, "endLocation", void 0);
exports.CreateRideInput = CreateRideInput = __decorate([
    (0, graphql_1.InputType)()
], CreateRideInput);
let UpdateRideInput = class UpdateRideInput {
};
exports.UpdateRideInput = UpdateRideInput;
__decorate([
    (0, graphql_1.Field)(() => [RideStopInput], { nullable: true }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMinSize)(2),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => RideStopInput),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], UpdateRideInput.prototype, "stops", void 0);
__decorate([
    (0, graphql_1.Field)(() => Date, { nullable: true }),
    (0, class_validator_1.IsDate)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], UpdateRideInput.prototype, "departureTime", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int, { nullable: true }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateRideInput.prototype, "totalSeats", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int, { nullable: true }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateRideInput.prototype, "availableSeats", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float, { nullable: true }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateRideInput.prototype, "pricePerSeat", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float, { nullable: true }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateRideInput.prototype, "priceScale", void 0);
__decorate([
    (0, graphql_1.Field)(() => Boolean, { nullable: true }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateRideInput.prototype, "girlsOnly", void 0);
__decorate([
    (0, graphql_1.Field)(() => ride_schema_1.RideStatus, { nullable: true }),
    (0, class_validator_1.IsEnum)(ride_schema_1.RideStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateRideInput.prototype, "status", void 0);
exports.UpdateRideInput = UpdateRideInput = __decorate([
    (0, graphql_1.InputType)()
], UpdateRideInput);
let SearchRideInput = class SearchRideInput {
    constructor() {
        this.minAvailableSeats = 1;
    }
};
exports.SearchRideInput = SearchRideInput;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID, { nullable: true }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SearchRideInput.prototype, "fromZoneId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID, { nullable: true }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], SearchRideInput.prototype, "toZoneId", void 0);
__decorate([
    (0, graphql_1.Field)({ nullable: true }),
    (0, class_validator_1.IsDate)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], SearchRideInput.prototype, "departureDate", void 0);
__decorate([
    (0, graphql_1.Field)(() => Boolean, { nullable: true }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], SearchRideInput.prototype, "girlsOnly", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int, { nullable: true, defaultValue: 1 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], SearchRideInput.prototype, "minAvailableSeats", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int, { nullable: true }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], SearchRideInput.prototype, "maxPrice", void 0);
exports.SearchRideInput = SearchRideInput = __decorate([
    (0, graphql_1.InputType)()
], SearchRideInput);
let BookingDeadlineInput = class BookingDeadlineInput {
};
exports.BookingDeadlineInput = BookingDeadlineInput;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BookingDeadlineInput.prototype, "rideId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int, { description: 'Minutes before departure to set as booking deadline' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(30),
    (0, class_validator_1.Max)(1440),
    __metadata("design:type", Number)
], BookingDeadlineInput.prototype, "minutesBeforeDeparture", void 0);
exports.BookingDeadlineInput = BookingDeadlineInput = __decorate([
    (0, graphql_1.InputType)()
], BookingDeadlineInput);
let ModifyDestinationInput = class ModifyDestinationInput {
};
exports.ModifyDestinationInput = ModifyDestinationInput;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ModifyDestinationInput.prototype, "bookingId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ModifyDestinationInput.prototype, "rideId", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ModifyDestinationInput.prototype, "newDropoffLocation", void 0);
exports.ModifyDestinationInput = ModifyDestinationInput = __decorate([
    (0, graphql_1.InputType)()
], ModifyDestinationInput);
//# sourceMappingURL=ride.dto.js.map