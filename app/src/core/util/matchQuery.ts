type Matchable = {[prop: string]: any};

export const matchQuery = (subject: Matchable | Array<Matchable>, query: Matchable): boolean => {
    let allMatch = true;

    if(Array.isArray(subject)) {
        subject.forEach(subSubject => {
            if(!matchQuery(subSubject, query)) {
                allMatch = false;
            }
        })

        return allMatch;
    }

    for(const prop in query) {
        if(query.hasOwnProperty(prop)) {
            if(!subject.hasOwnProperty(prop) || subject[prop] !== query[prop]) {
                return false;
            }
        }
    }

    return allMatch;
}
