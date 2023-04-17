import React, {useEffect} from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import * as serviceWorker from './serviceWorker';
import {BrowserRouter} from "react-router-dom";
import {Provider} from 'react-redux';
import {Redirect, Route, RouteComponentProps, Router, Switch} from 'react-router';
import {useBreadcrumbs} from "./core/util/hook/useBreadcrumbs";
import MainLayout from './core/layout/MainLayout';
import SnackbarStack from './core/components/SnackbarStack';
import { PersistGate } from 'redux-persist/integration/react';
import { persistor, store } from './store';
import ThemeProvider from './material-ui/ThemeProvider';
import {dashboardPage} from './routes';
import {Logger} from "./core/util/Logger";
import DashboardPage from './pages/DashboardPage';

let lastRenderedRoute: string;
const RenderRoute = (props: {Component: React.ComponentType } & RouteComponentProps<any>) => {
    const [, setBreadCrumbs] = useBreadcrumbs();

    useEffect(() => {
        setBreadCrumbs(props);
    }, [props])

    useEffect(() => {
        if(lastRenderedRoute !== props.location.pathname) {
            window.scrollTo({
                top: 0,
                behavior: "auto"
            })
        }
        lastRenderedRoute = props.location.pathname;
    })

    // @ts-ignore
    return <props.Component {...props}/>
}

const Main = () => (
    <Switch>
        <Route path={dashboardPage} exact={true} render={props => <RenderRoute {...props} Component={DashboardPage} />} />
        <Redirect from={'/'} to={dashboardPage} />
    </Switch>
);

ReactDOM.render((
  <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
          <ThemeProvider>
              <BrowserRouter basename="/ims">
                  <MainLayout>
                      <Main/>
                  </MainLayout>
              </BrowserRouter>
              <SnackbarStack />
          </ThemeProvider>
      </PersistGate>
  </Provider>
), document.getElementById('root'));
