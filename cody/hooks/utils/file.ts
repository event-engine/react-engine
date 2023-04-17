import {CodyResponse, CodyResponseType, isCodyError} from "../../src/general/response";
import fs from "fs";
import {writeFileSync} from "../../src/utils/filesystem";
import {Node} from "../../src/board/graph";
import {overrideFileDetails} from "./response";
import {SchemaDefinitions} from "../types";
import {isFileExcluded} from "tslint/lib/configuration";
import {Context} from "../context";

export interface FileDescription {
    content: string;
    filePath: string;
    description: string;
    successMessage: string;
    node: Node;
}

export function readFileToJson<T>(filePath: string, validate?: (jsonContent: T) => T | CodyResponse): T | CodyResponse {
    if(!fs.existsSync(filePath)) {
        return {
            cody: `File ${filePath} not found`,
            type: CodyResponseType.Error
        }
    }

    if(!validate) {
        validate = jsonContent => jsonContent;
    }

    const content = fs.readFileSync(filePath);

    try {
        return validate(JSON.parse(content.toString()));
    } catch (e) {
        return {
            cody: `Failed to parse file ${filePath}. It contains invalid JSON`,
            details: e.toString(),
            type: CodyResponseType.Error
        }
    }
}

export const writeMultipleFilesWithOverrideCheck = (files: FileDescription[], successDetails: string, finalSuccessMessage: string, ctx: Context): CodyResponse => {
    const successResponse = (): CodyResponse => {
        return {
            cody: finalSuccessMessage,
            details: ['%c'+successDetails, 'color: #73dd8e;font-weight: bold'],
        }
    }

    let filesWritten = 0;

    const writeNextFile = (): CodyResponse | null => {
        if(files[filesWritten]) {
            const {content, filePath, description, successMessage, node} = files[filesWritten];

            const fileExists = fs.existsSync(filePath);

            const writeFile = (): CodyResponse | null => {
                const writeErr = writeFileSync(filePath, content);

                if(isCodyError(writeErr)) {
                    return writeErr;
                }

                filesWritten++;
                successDetails = successDetails + `✔️ ${successMessage}\n`;
                return writeNextFile();
            }

            if(!fileExists) {
                return writeFile();
            } else {
                if(shouldIgnoreFile(filePath)) {
                    filesWritten++;
                    successDetails = successDetails + `⏩️ Skipped ${filePath} due to // @cody-ignore\n`;
                    return writeNextFile();
                }

                if(ctx.silent) {
                    filesWritten++;
                    successDetails = successDetails + `⏩️ Skipped ${filePath}. It exists already and cody runs in silent mode\n`;
                    return writeNextFile();
                }

                return {
                    cody: `Oh, there is already a ${description} for "${node.getName()}".`,
                    details: overrideFileDetails(filePath),
                    type: CodyResponseType.Question,
                    reply: (override: string): Promise<CodyResponse> => {
                        return new Promise<CodyResponse>(resolve1 => {
                            if(override === 'yes' || override === 'y') {
                                const wfRes = writeFile();

                                if(wfRes === null) {
                                    resolve1(successResponse());
                                }

                                resolve1(wfRes as CodyResponse);
                            } else {
                                filesWritten++;
                                const wfRes = writeNextFile();

                                if(wfRes === null) {
                                    resolve1(successResponse());
                                }

                                resolve1(wfRes as CodyResponse);
                            }
                        })
                    }
                }
            }

        }

        return null;
    }

    const nextResult = writeNextFile();

    if(nextResult === null) {
        return successResponse();
    }

    return nextResult as CodyResponse;
}

export const getVoFile = (voName: string, defs: SchemaDefinitions): string | CodyResponse => {
    if(!defs.sourceMap.hasOwnProperty(voName)) {
        return {
            cody: `Can't find "${voName}" in the source map of schema-definitions.json`,
            details: `I keep track of every value object file in this map, but seems that I never generated one for ${voName}. I don't know where to find it.`,
            type: CodyResponseType.Error
        }
    }

    return defs.sourceMap[voName];
}

export const getStateDescriptionFile = (voName: string, defs: SchemaDefinitions): string | CodyResponse => {
    const voFile = getVoFile(voName, defs);

    if(isCodyError(voFile)) {
        return voFile;
    }

    const descriptionFile = voFile.replace(`${voName}.ts`, `${voName}.desc.ts`);

    if(!fs.existsSync(descriptionFile)) {
        return {
            cody: `I expected to find a ${descriptionFile} in the same location as the value object file for ${voName}, but there is none`,
            details: `Usually, I generate such a file if an information card (green one) references aggregate state. I need the description to generate a StateView react component.`,
            type: CodyResponseType.Error
        }
    }

    return descriptionFile;
}

export const shouldIgnoreFile = (filePath: string): boolean => {
    if(!fs.existsSync(filePath)) {
        return false;
    }

    return  fs.readFileSync(filePath).includes('// @cody-ignore');
}
