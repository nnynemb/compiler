import Session from "../models/session.model.js";

const sessionStore = {
    // update the code in the session , update language as well
    async updateCodeInSession(sessionId, code, language) {
        const reesponse = await Session.findByIdAndUpdate(sessionId, { code, language });
        console.log('Code updated in session:', reesponse);
        return reesponse;
    }
};

export default sessionStore;