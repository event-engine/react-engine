import {EngineConfig} from "../types";
import {Context} from "../context";
import {CodyResponse} from "../../src/general/response";
import {lcWord, ucWord} from "../../src/utils/string";
import {writeFileSync} from "../../src/utils/filesystem";

export const refreshSidebar = (config: EngineConfig, ctx: Context): CodyResponse | null => {
    let iconImports = '';
    let routesImports = '';
    const sidebarItems: string[] = [];
    const importedIcons: string[] = [];
    let dashboardItem: string = `<ListItem className={classes.item} disableGutters={true}>
                <Button
                    activeClassName={classes.active}
                    className={classes.button}
                    component={NavLink}
                    to={dashboardPage}
                    children={(
                        <>
                            <div className={classes.icon}><DashboardIcon /></div>
                            Dashboard
                        </>
                    )}
                />
            </ListItem>`;

    for (const route in config.pages) {
        if(!config.pages.hasOwnProperty(route)) {
            continue;
        }

        const page = config.pages[route];

        if(!page.topLevel || !page.icon || !page.menuLabel) {
            continue;
        }

        if(page.component === 'DashboardPage') {
            dashboardItem = compileSidebarItem({component: page.component, icon: page.icon, menuLabel: page.menuLabel});
            // Always first Sidebar entry
            continue;
        }

        if(!importedIcons.includes(page.icon)) {
            importedIcons.push(page.icon);
            iconImports = iconImports + `import ${ucWord(page.icon)}Icon from '@material-ui/icons/${ucWord(page.icon)}';\n`;
        }

        routesImports = routesImports + `, ${lcWord(page.component)}`;
        sidebarItems.push(compileSidebarItem({component: page.component, icon: page.icon, menuLabel: page.menuLabel}))
    }

    const content = `import {Button, List, ListItem, makeStyles} from '@material-ui/core';
import React from 'react';
import {NavLink} from 'react-router-dom';
import {useBreadcrumbs} from "../core/util/hook/useBreadcrumbs";
import SideBarSubMenu from "../core/layout/SideBarSubMenu";
import DashboardIcon from '@material-ui/icons/Dashboard';
import {dashboardPage${routesImports}} from "../routes";
import PhotoCameraIcon from "@material-ui/icons/PhotoCamera";
${iconImports}

const useStyles = makeStyles(theme => ({
    root: {
        width: '100%',
        flex: 1,
    },
    item: {
        display: 'flex',
        paddingTop: 0,
        paddingBottom: 0,
    },
    button: {
        color: theme.palette.secondary.main,
        padding: '10px 8px',
        justifyContent: 'flex-start',
        textTransform: 'none',
        letterSpacing: 0,
        width: '100%',
        fontWeight: theme.typography.fontWeightMedium,
    },
    icon: {
        width: 24,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        marginRight: theme.spacing(1),
    },
    active: {
        color: theme.palette.primary.main,
        fontWeight: theme.typography.fontWeightMedium,
    },
}));

const SideBarContent = () => {

    const classes = useStyles();
    
    const [breadcrumbs, ] = useBreadcrumbs();

    const topLevelCrumbRoute = breadcrumbs.length? breadcrumbs[0].route : null;

    return (
        <List disablePadding={true} className={classes.root}>
            ${dashboardItem}
            ${sidebarItems.join('\n')}
        </List>
    );
};

export default SideBarContent;`;

    return writeFileSync(ctx.feFolder + '/layout/SideBarContent.tsx', content);
}

const compileSidebarItem = (page: {component: string, icon: string, menuLabel: string}): string => {
    return `<ListItem className={classes.item} disableGutters={true}>
                <Button
                    activeClassName={classes.active}
                    className={classes.button}
                    component={NavLink}
                    to={${lcWord(page.component)}}
                    children={(
                        <>
                            <div className={classes.icon}><${ucWord(page.icon)}Icon /></div>
                            ${page.menuLabel}
                        </>
                    )}
                />
            </ListItem>
            {topLevelCrumbRoute === ${lcWord(page.component)} && <SideBarSubMenu />}
`;
}
