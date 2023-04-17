import {Button, List, ListItem, makeStyles} from '@material-ui/core';
import React from 'react';
import {NavLink} from 'react-router-dom';
import {useBreadcrumbs} from "../core/util/hook/useBreadcrumbs";
import SideBarSubMenu from "../core/layout/SideBarSubMenu";
import DashboardIcon from '@material-ui/icons/Dashboard';
import {dashboardPage} from "../routes";


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
            <ListItem className={classes.item} disableGutters={true}>
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
            </ListItem>
        </List>
    );
};

export default SideBarContent;
