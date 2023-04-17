import * as React from 'react';
import {Card, CardActions, CardHeader, Divider, makeStyles} from "@material-ui/core";
import {useEffect, useState} from "react";

const useStyles = makeStyles(theme => ({
    commandBarFixed: {
        position: 'fixed',
        zIndex: 1000,
        top: '60px',
        width: 'auto',
        right: '20px',
        [theme.breakpoints.down('lg')]: {
            left: '20px'
        },
        [theme.breakpoints.up('lg')]: {
            left: '320px'
        }
    },
    actions: {
        overflow: "auto",
        whiteSpace: "nowrap",
        '& button': {
            minWidth: "160px"
        }
    }
}));

interface OwnProps {
    children: React.ReactChild[] | React.ReactChild
}

type CommandBarProps = OwnProps;

const CommandBar = (props: CommandBarProps) => {
    const classes = useStyles();
    const [fixed, setFixed] = useState<boolean>(false);

    useEffect(() => {
        const listener = () => {
            const scrollTop = window.scrollY;

            if(scrollTop >= 80) {
                setFixed(true);
            } else {
                setFixed(false);
            }
        }

        window.addEventListener('scroll', listener);

        listener();

        return () => {
            window.removeEventListener('scroll', listener);
        }
    })

    return <>
        <Card className={fixed? classes.commandBarFixed : ''}>
            {!fixed && <CardHeader title="Actions"/>}
            {!fixed && <Divider/>}
            <CardActions className={classes.actions}>
                {props.children}
            </CardActions>
        </Card>
        {fixed && /* Mirror card to keep same space in the DOM */ <Card>
            <CardHeader title="Actions"/>
            <Divider/>
            <CardActions className={classes.actions}>
                {props.children}
            </CardActions>
        </Card>}
    </>
};

export default CommandBar;
