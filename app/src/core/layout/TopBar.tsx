import React from 'react';
import {
    AppBar,
    Toolbar as MuiToolbar,
    makeStyles,
} from '@material-ui/core';
import Breadcrumbs from "./Breadcrumbs";
import TopBarBranding from "../../layout/TopBarBranding";
import TopBarMenu from "../../layout/TopBarMenu";

const useStyles = makeStyles(theme => ({
    root: {
        boxShadow: 'none',
        backgroundColor: (theme.palette.background as any).topBar,
        height: '64px',
    },
    flexGrow: {
        flexGrow: 1,
    },
    branding: {
        [theme.breakpoints.up('lg')]: {
            minWidth: '300px'
        },
    }
}));

interface TopBarProps {
    onOpenSideBar: () => void;
}

const TopBar = (props: TopBarProps) => {
    const classes = useStyles();


    return (
        <AppBar position={'fixed'} color={'default'} className={classes.root}>
            <MuiToolbar>
                <div className={classes.branding}>
                    <TopBarBranding />
                </div>
                <Breadcrumbs />
                <div className={classes.flexGrow} />
                <TopBarMenu onOpenSideBar={props.onOpenSideBar} />
            </MuiToolbar>
        </AppBar>
    );
};

export default TopBar;
