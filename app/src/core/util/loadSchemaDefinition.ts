import schemaDefinitions from "../../schema-definitions.json";
import {SchemaDefinitions} from "../types";

export const loadSchemaDefinitions = (): SchemaDefinitions => {
    return schemaDefinitions as SchemaDefinitions;
}
