import * as React from 'react';
import {RouteComponentProps, withRouter} from "react-router";
import {Link} from "react-router-dom";
import {useBreadcrumbs} from "../util/hook/useBreadcrumbs";
import MaterialBreadcrumbs from '@material-ui/core/Breadcrumbs';
import {makeStyles, Typography} from "@material-ui/core";

const useStyles = makeStyles(theme => ({
    root: {
        [theme.breakpoints.down('md')]: {
            display: 'none'
        },
    },
    link: {
        color: theme.palette.primary.main,
        textDecoration: 'none',
    },
    lastLink: {
        color: 'white'
    }
}));

interface OwnProps {

}

type BreadcrumbsProps = OwnProps & RouteComponentProps<{[param: string]: string}>;

const Breadcrumbs = (props: BreadcrumbsProps) => {
    const classes = useStyles();
    const [breadcrumbs,] = useBreadcrumbs();

    const links = breadcrumbs.map((crumb, index) => {
        if(index === breadcrumbs.length - 1) {
            return <Typography
                key={crumb.route}
                className={classes.lastLink}
                aria-current="page">{crumb.label}</Typography>
        } else {
            return <Link to={crumb.compiledRoute} key={crumb.route} className={classes.link}>{crumb.label}</Link>
        }
    })

    return <div className={classes.root}>
        <MaterialBreadcrumbs aria-label="breadcrumb">
            {links}
        </MaterialBreadcrumbs>
    </div>
};

export default withRouter(Breadcrumbs);
