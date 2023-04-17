import {RouteComponentProps} from "react-router";
import {loadEngineConfig} from "../loadEngineConfig";
import {Page} from "../../types";
import {camelCaseToTitle, isTemplateString} from "../string";
import {useDispatch, useSelector} from "react-redux";
import {makeCurrentBreadcrumbsSelector} from "../../selector/breadcrumbsSelector";
import {setCurrentBreadcrumbs} from "../../action/breadcrumbsCommands";
import React from "react";
import * as BreadcrumbsProviders from "../../../layout/DynamicBreadcrumbsProviders";

export interface Breadcrumb {
    compiledRoute: string;
    route: string;
    label: string | React.ReactNode;
}

const pageLabel = (page: Page, routeProps: RouteComponentProps<{[param: string]: string}>): string | React.ReactNode => {
    if(page.breadcrumbLabel) {
        if(!isTemplateString(page.breadcrumbLabel)) {
            return page.breadcrumbLabel;
        }

        const providerFactory = `provide${page.component}Label`;

        if(Object.keys(BreadcrumbsProviders).includes(providerFactory)) {
            // @ts-ignore
            return BreadcrumbsProviders[providerFactory](routeProps.match.params);
        }

        return page.breadcrumbLabel;
    }

    if(page.menuLabel) {
        return page.menuLabel;
    }

    return camelCaseToTitle(page.component.replace(/Page$/, ''));
}

let lastPath: string = '';

export const useBreadcrumbs = (): [Breadcrumb[], (props: RouteComponentProps<any>) => void] => {

    const dispatch = useDispatch();
    const currentBreadcrumbs = useSelector(makeCurrentBreadcrumbsSelector());

    const setBreadcrumbs = (routeProps: RouteComponentProps<{[param: string]: string}>) => {
        const {path, params} = routeProps.match;

        if(path === lastPath) {
            return;
        }

        lastPath = path;

        const {pages} = loadEngineConfig();

        const crumbs: Breadcrumb[] = [];

        for (const route in pages) {
            if(path.includes(route)) {
                const crumbPath = Object.keys(params).length > 0
                    ? Object.keys(params).reduce((path, param) => path.replace(`:${param}`, params[param]), route)
                    : route;

                crumbs.push({
                    compiledRoute: crumbPath,
                    route: route,
                    label: pageLabel(pages[route], routeProps),
                })
            }
        }

        dispatch(setCurrentBreadcrumbs({breadcrumbs: crumbs}));
    }




    return [currentBreadcrumbs, setBreadcrumbs];
}
