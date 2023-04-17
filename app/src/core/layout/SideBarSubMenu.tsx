import * as React from 'react';
import {Button, List, ListItem, makeStyles, useMediaQuery} from "@material-ui/core";
import {Breadcrumb, useBreadcrumbs} from "../util/hook/useBreadcrumbs";
import {NavLink} from "react-router-dom";
import {dashboardPage} from "../../routes";
import DashboardIcon from "@material-ui/icons/Dashboard";
import {useEffect, useState} from "react";
import {lightTheme as muiTheme} from "../../material-ui/theme";
import {
    listenOnSideBarAnchorsRendered, stopListeningOnSideBarAnchorsRendered,
    WINDOW_EVENT_SIDEBAR_ANCHORS_RENDERED
} from "../util/triggerSideBarAnchorsRendered";

interface OwnProps {

}

const HEADER_OFFSET = 128;

const useStyles = makeStyles(theme => ({
    nested: {
        width: "100%",
        flex: 1,
        paddingLeft: theme.spacing(1)
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
    item: {
        display: 'flex',
        paddingTop: 0,
        paddingBottom: 0,
    },
    anchorItem: {
        display: 'flex',
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: theme.spacing(1),
        marginLeft: theme.spacing(2),
        width: 'calc(100% - '+theme.spacing(2)+'px)',
        borderLeft: '2px solid ' + theme.palette.grey.A100,
    },
    active: {
        color: theme.palette.primary.main,
        fontWeight: theme.typography.fontWeightMedium,
    },
    anchorItemActive: {
        borderLeft: '2px solid ' + theme.palette.primary.main,
    }
}))

type SideBarSubMenuProps = OwnProps;

interface Anchor {
    label: string;
    hash: string;
    active: boolean;
    htmlEl: Element
}

const isScrolledToBottom = () => {
    return document.body.scrollHeight ==
    document.documentElement.scrollTop +
    window.innerHeight;
}

const detectActiveAnchor = (anchors: Anchor[]): Anchor | null => {
    if(anchors.length === 0) {
        return null;
    }

    let lastAnchor: Anchor = anchors[0];

    anchors.forEach(anchor => {
        if(anchor.htmlEl.getBoundingClientRect().top <= HEADER_OFFSET + 10) {
            lastAnchor = anchor;
        }
    })
    // Page is scrollable and bottom is reached. Let's highlight the anchor that's closest to the top, but fully visible
    if(anchors.indexOf(lastAnchor) < anchors.length - 1 && document.documentElement.scrollTop > 0 && isScrolledToBottom()) {
        [...anchors].reverse().forEach(anchor => {
            if(anchor.htmlEl.getBoundingClientRect().top > HEADER_OFFSET + 10) {
                lastAnchor = anchor;
            }
        });
    }

    return lastAnchor;
}

const scrollToElement = (ele: Element) => {
    const elementPosition = ele.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - HEADER_OFFSET;

    window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
    });
}

let scrollListenerRef: unknown;

const SideBarSubMenu = (props: SideBarSubMenuProps) => {

    const classes = useStyles();
    const [breadcrumbs, ] = useBreadcrumbs();
    const [anchors, setAnchors] = useState<Anchor[]>([]);

    useEffect(() => {
        setAnchors([]);
        const scrollListener = (anchors: Anchor[]) => {
            const newActiveAnchor = detectActiveAnchor(anchors);

            let currentlyActiveAnchor: Anchor|undefined = undefined;

            anchors.forEach(anchor => {
                if(anchor.active) {
                    currentlyActiveAnchor = anchor;
                }

                anchor.active = false
            });

            if(newActiveAnchor) {
                newActiveAnchor.active = true;
            }

            if(newActiveAnchor !== currentlyActiveAnchor) {
                setAnchors([...anchors]);
            }
        }

        const anchorsRenderedListener = () => {
            const cachedHtmlAnchors = document.getElementsByClassName('sidebar-anchor');
            const tempAnchors: Anchor[] = [];

            for(let i = 0; i < cachedHtmlAnchors.length; i++) {
                const htmlAnchor = cachedHtmlAnchors.item(i);

                if(htmlAnchor) {
                    tempAnchors.push({
                        label: htmlAnchor.innerHTML,
                        hash: '#' + htmlAnchor.id,
                        active: false,
                        htmlEl: htmlAnchor
                    })
                }
            }
            setAnchors(tempAnchors);

            document.removeEventListener('scroll', scrollListenerRef as () => void);

            scrollListenerRef = () => {
                scrollListener(tempAnchors);
            }


            document.addEventListener('scroll', scrollListenerRef as () => void);

            scrollListener(tempAnchors);
        }

        stopListeningOnSideBarAnchorsRendered(anchorsRenderedListener);
        listenOnSideBarAnchorsRendered(anchorsRenderedListener);
        anchorsRenderedListener();

        return () => {
            if(scrollListenerRef) {
                document.removeEventListener('scroll', scrollListenerRef as () => void);
            }

            stopListeningOnSideBarAnchorsRendered(anchorsRenderedListener);
        }
    }, [breadcrumbs]);

    const renderNextLevel = (nextLevel: number) => {
        if(nextLevel < breadcrumbs.length) {
            const breadcrumb = breadcrumbs[nextLevel];

            return <List disablePadding={true} className={classes.nested}>
                <ListItem className={classes.item}>
                    <Button
                        activeClassName={classes.active}
                        className={classes.button}
                        component={NavLink}
                        to={breadcrumb.compiledRoute}
                        children={breadcrumb.label}
                        onClick={() => {
                            window.scrollTo({
                                top: 0,
                                behavior: "smooth"
                            })
                        }}
                    />
                </ListItem>
                {renderNextLevel(nextLevel+1)}
            </List>
        }

        if(!anchors.length) {
            return <></>
        }

        return <List className={classes.nested}>{anchors.map(anchor => {
            return <ListItem id={anchor.hash} key={anchor.hash} className={classes.anchorItem + (anchor.active? ' ' + classes.anchorItemActive : '')} >
                <Button
                    activeClassName={classes.active}
                    className={classes.button}
                    component={NavLink}
                    to={anchor.hash}
                    isActive={() => anchor.active}
                    children={anchor.label}
                    onClick={() => {
                        scrollToElement(anchor.htmlEl)
                    }}
                />
            </ListItem>
        })}</List>
    }

    return renderNextLevel(1);
};

export default SideBarSubMenu;
