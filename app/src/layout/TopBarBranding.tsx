import * as React from 'react';
import {makeStyles, Typography} from "@material-ui/core";

const useStyles = makeStyles(theme => ({
    headerText: {
        color: theme.palette.primary.main,
    },
}))

interface OwnProps {

}

type TopBarBrandingProps = OwnProps;

const TopBarBranding = (props: TopBarBrandingProps) => {
    const classes = useStyles();

    return <Typography variant={'h1'} className={classes.headerText}>React Engine</Typography>
};

export default TopBarBranding;
