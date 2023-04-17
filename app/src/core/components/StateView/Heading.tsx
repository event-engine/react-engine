import * as React from 'react';
import {FieldProps} from "@rjsf/core";
import {getObjPropTitleClass, headingNestingLevel, useStyles as useStateViewStyles} from "../StateView";
import {getUiTitle} from "../../util/getUiTitle";
import {Typography} from "@material-ui/core";

interface OwnProps {

}

type HeadingProps = OwnProps & FieldProps;

const Heading = (props: HeadingProps) => {
    const stateViewClasses = useStateViewStyles();

    const headingVariant = headingNestingLevel(props.idSchema.$id);

    return <Typography
        id={props.idSchema.$id}
        key={props.idSchema.$id}
        variant={headingVariant}
        className={getObjPropTitleClass(headingVariant, stateViewClasses)}>{getUiTitle(props)}</Typography>
};

export default Heading;
