import * as React from 'react';
import {Box, LinearProgress, LinearProgressProps, Typography} from "@material-ui/core";

interface OwnProps {
    value: number;
}

type LinearProgressWithLabelProps = OwnProps & LinearProgressProps;

const LinearProgressWithLabel = (props: LinearProgressWithLabelProps) => {
    return (
        <Box display="flex" alignItems="center">
            <Box width="100%" mr={1}>
                <LinearProgress variant="determinate" {...props} />
            </Box>
            <Box minWidth={35}>
                <Typography variant="body2" color="textSecondary">{`${Math.round(
                    props.value,
                )}%`}</Typography>
            </Box>
        </Box>
    );
};

export default LinearProgressWithLabel;
