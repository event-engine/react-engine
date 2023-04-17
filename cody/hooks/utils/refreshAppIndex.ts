import {EngineConfig} from "../types";
import {Context} from "../context";
import {CodyResponse} from "../../src/general/response";
import {lcWord} from "../../src/utils/string";
import {writeFileSync} from "../../src/utils/filesystem";

export const refreshAppIndex = (config: EngineConfig, ctx: Context): CodyResponse | null => {
    const routes: string[] = [];
    let routesImports = '';
    let componentsImports = '';

    for(const route in config.pages) {
        if(!config.pages.hasOwnProperty(route)) {
            continue;
        }

        const page = config.pages[route];

        routes.push(`        <Route path={${lcWord(page.component)}} exact={true} render={props => <RenderRoute {...props} Component={${page.component}} />} />`);
        routesImports = routesImports + `, ${lcWord(page.component)}`;
        componentsImports = componentsImports + `import ${page.component} from "./pages/${page.component}";\n`;
    }

    const dashboardRoute = `        <Route path={dashboardPage} exact={true} render={props => <RenderRoute {...props} Component={DashboardPage} />} />`;
    if(!routes.includes(dashboardRoute)) {
        routes.push(dashboardRoute);
        componentsImports = componentsImports + `import DashboardPage from './pages/DashboardPage';`;
        routesImports = routesImports + `, dashboardPage`;
    }
    routes.push(`        <Redirect from={'/'} to={dashboardPage} />`);

    const content = `import React, {useEffect} from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import * as serviceWorker from './serviceWorker';
import {BrowserRouter} from "react-router-dom";
import {Provider} from 'react-redux';
import {Redirect, Route, RouteComponentProps, Router, Switch} from 'react-router';
import {useBreadcrumbs} from "./core/util/hook/useBreadcrumbs";
import MainLayout from './core/layout/MainLayout';
import SnackbarStack from './core/components/SnackbarStack';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor, store } from './store';
import ThemeProvider from './material-ui/ThemeProvider';
import {${routesImports.slice(2)}} from './routes';
import {Logger} from "./core/util/Logger";
${componentsImports}

let lastRenderedRoute: string;
const RenderRoute = (props: {Component: React.ComponentType } & RouteComponentProps<any>) => {
    const [, setBreadCrumbs] = useBreadcrumbs();
    
    useEffect(() => {
        setBreadCrumbs(props);
    }, [props])
    
    useEffect(() => {
        if(lastRenderedRoute !== props.location.pathname) {
            window.scrollTo({
                top: 0,
                behavior: "auto"
            })
        }
        lastRenderedRoute = props.location.pathname;
    })
    
    // @ts-ignore
    return <props.Component {...props}/>
}

const Main = () => (
    <Switch>
${routes.join('\n')}
    </Switch>
);

ReactDOM.render((
    <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
            <ThemeProvider>
                <BrowserRouter${ctx.basename? ' basename="'+ctx.basename+'"' : ''}>
                    <MainLayout>
                        <Main/>
                    </MainLayout>
                </BrowserRouter>
                <SnackbarStack />
            </ThemeProvider>
        </PersistGate>
    </Provider>
), document.getElementById('root'));
`;

    return writeFileSync(ctx.feFolder+'/index.tsx', content);
}
