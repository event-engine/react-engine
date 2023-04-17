import React from 'react';
import {Typography} from '@material-ui/core';
import Grid from '@material-ui/core/Grid';
import {useSelector} from "react-redux";
import {makeUserSelector} from "../core/selector/userSelector";

const DashboardPage = () => {
    const user = useSelector(makeUserSelector())

    return (

        <Grid container spacing={10}>
            <Grid item={true} xs={12}>
                <Typography variant={'h2'}>
                    Welcome to React Engine!
                </Typography>
            </Grid>
            <Grid item={true} xs={12}>
                <div>
                    <Typography variant={'h3'} >This is an experimental app</Typography>
                    <Typography variant={'subtitle1'}>A PoC to validate how fast serverless, event-driven development can be and how easy it is to work with NodeJS and TypeScript.</Typography>
                </div>
            </Grid>
        </Grid>
    );
};

export default DashboardPage;
