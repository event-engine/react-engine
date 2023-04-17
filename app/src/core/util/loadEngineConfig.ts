import {EngineConfig} from "../types";
import config from "../../event-engine.json";

export const loadEngineConfig = (): EngineConfig => {
    return config as EngineConfig;
}
