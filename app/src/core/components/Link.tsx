import {Link as ReactRouterLink} from 'react-router-dom';
import MaterialUiLink from '@material-ui/core/Link';
import React, {ReactNode} from 'react';

interface LinkProps {
    children: ReactNode;
    to: string;
    onClick?: (event: React.MouseEvent) => void;
    style?: React.CSSProperties | undefined
}

const Link = (props: LinkProps) => {
    return (
        <MaterialUiLink component={ReactRouterLink} to={props.to} onClick={props.onClick} style={props.style}>
            {props.children}
        </MaterialUiLink>
    );
};

export default Link;
