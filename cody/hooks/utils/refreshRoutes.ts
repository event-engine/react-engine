import {EngineConfig} from "../types";
import {Context} from "../context";
import {CodyResponse} from "../../src/general/response";
import {lcWord} from "../../src/utils/string";
import {writeFileSync} from "../../src/utils/filesystem";

export const refreshRoutes = (config: EngineConfig, ctx: Context): CodyResponse | null => {
    const routes: string[] = [];

    for(const route in config.pages) {
        if(!config.pages.hasOwnProperty(route)) {
            continue;
        }

        routes.push(`export const ${lcWord(config.pages[route].component)} = '${route}';`)
    }

    const dashboardPage = `export const dashboardPage = '/dashboard';`;

    if(!routes.includes(dashboardPage)) {
        routes.push(dashboardPage);
    }


    const content = `import {State} from "./core/types";
    
${routes.join('\n')}
    
export const make = (route: string, parameters: State): string => {
    const parts = route.split('/');

    parts.forEach(part => {
        if(part.charAt(0) === ':') {
            const prop = part.slice(1);
            if(parameters.hasOwnProperty(prop)) {
                route = route.replace(part, parameters[prop]);
            }
        }
    })

    return route;
}
`;

    return writeFileSync(ctx.feFolder+'/routes.ts', content);
}
