import * as React from 'react';
import {useDispatch, useSelector} from "react-redux";
import {makeThemeSelector} from "../core/selector/settingsSelector";
import {useState} from "react";
import {themeSwitched} from "../core/action/settingsEvents";
import {Hidden, IconButton, makeStyles, Menu, MenuItem} from "@material-ui/core";
import SettingsIcon from "@material-ui/icons/Settings";
import Brightness4Icon from "@material-ui/icons/Brightness4";
import Brightness7Icon from "@material-ui/icons/Brightness7";
import MenuIcon from "@material-ui/icons/Menu";
import PersonIcon from "@material-ui/icons/Person";
import SettingsDialog from "../core/layout/SettingsDialog";

const useStyles = makeStyles(theme => ({
    icon: {
        color: 'white',
    },
    closeButton: {
        position: 'absolute',
        right: theme.spacing(1),
        top: theme.spacing(1),
        color: theme.palette.grey[500],
    },
}));

interface OwnProps {
    onOpenSideBar: () => void;
}

type TopBarMenuProps = OwnProps;

const TopBarMenu = (props: TopBarMenuProps) => {
    const classes = useStyles();
    const dispatch = useDispatch();
    const theme = useSelector(makeThemeSelector());
    const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
    const [userMenuAnchorEl, setUserMenuAnchorEl] = React.useState<null | HTMLElement>(null);

    const openSettingsDialog = () => {
        setSettingsOpen(true) ;
    };

    const closeSettingsDialog = () => {
        setSettingsOpen(false);
    };

    const toggleTheme = () => {
        dispatch(themeSwitched({ theme: (theme === 'dark' ? 'light' : 'dark') }));
    };

    const handleUserMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setUserMenuAnchorEl(event.currentTarget);
    }

    const handleCloseUserMenu = () => {
        setUserMenuAnchorEl(null);
    };

    return <>
        <IconButton className={classes.icon} title={'Settings'} onClick={openSettingsDialog}>
            <SettingsIcon />
        </IconButton>
        <IconButton className={classes.icon} title={'Toggle Theme'} onClick={toggleTheme}>
            {theme === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
        </IconButton>
        <Hidden lgUp={true}>
            <IconButton onClick={props.onOpenSideBar} className={classes.icon}>
                <MenuIcon />
            </IconButton>
        </Hidden>
        {settingsOpen && <SettingsDialog open={settingsOpen} onClose={closeSettingsDialog} />}
    </>
};

export default TopBarMenu;
