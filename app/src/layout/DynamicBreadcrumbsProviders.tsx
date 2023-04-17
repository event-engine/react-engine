import React from 'react';

/**
 * Placeholder provider factory to illustrate basic idea of breadcrumb providers
 *
 * @param routeParams Use route params to select/fetch data
 */
export const provideEmptyLabel = (routeParams: {[param: string]: string}) => {

    // Return a React.ReactNode that'll render the breadcrumb label
    return <></>
}
