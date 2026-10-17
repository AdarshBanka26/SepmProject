import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import { API_BASE_URL, AUTH_STORAGE_KEY } from './config';
const initialAuthForm = { username: '', email: '', password: '' };
const initialLoginForm = { email: '', password: '' };
const initialWorkForm = {
    title: '',
    description: '',
    category: 'ART',
    fileUrl: '',
    tags: ''
};
const initialCollectionForm = {
    title: '',
    description: '',
    isCollaborative: false
};
const initialProfileForm = {
    username: '',
    firstName: '',
    lastName: '',
    bio: '',
    website: '',
    avatarUrl: ''
};
function loadSession() {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
        if (!parsed?.token || !parsed?.user?.id) {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}
function saveSession(session) {
    if (session) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    }
    else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
    }
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function getTags(work) {
    if (!Array.isArray(work.tags)) {
        return [];
    }
    return work.tags.filter((tag) => typeof tag === 'string');
}
function formatMoney(value) {
    if (typeof value !== 'number') {
        return '$0';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}
function displayName(user) {
    if (!user) {
        return 'Guest';
    }
    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : user.username || 'Creator';
}
async function apiRequest(path, options = {}) {
    const headers = new Headers();
    if (options.token) {
        headers.set('Authorization', `Bearer ${options.token}`);
    }
    if (options.body !== undefined) {
        headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });
    const text = await response.text();
    let payload = null;
    if (text) {
        try {
            payload = JSON.parse(text);
        }
        catch {
            payload = { message: text };
        }
    }
    if (!response.ok) {
        const message = isRecord(payload) ? String(payload.message ?? payload.error ?? `Request failed with ${response.status}`) : `Request failed with ${response.status}`;
        throw new Error(message);
    }
    return payload;
}
function StatCard({ label, value, tone = 'aqua' }) {
    return (_jsxs("div", { className: `stat-card tone-${tone}`, children: [_jsx("span", { children: label }), _jsx("strong", { children: value })] }));
}
function SectionTitle({ eyebrow, title, subtitle }) {
    return (_jsxs("div", { className: "section-title", children: [_jsx("p", { children: eyebrow }), _jsx("h2", { children: title }), _jsx("span", { children: subtitle })] }));
}
function Badge({ children }) {
    return _jsx("span", { className: "badge", children: children });
}
function Avatar({ label }) {
    return _jsx("div", { className: "avatar", children: label.slice(0, 1).toUpperCase() });
}
export default function GalleryApp() {
    const [session, setSession] = useState(() => loadSession());
    const [route, setRoute] = useState(window.location.pathname || '/');
    const [activeView, setActiveView] = useState('explore');
    const [works, setWorks] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [users, setUsers] = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [saved, setSaved] = useState(null);
    const [followers, setFollowers] = useState([]);
    const [following, setFollowing] = useState([]);
    const [selectedWork, setSelectedWork] = useState(null);
    const [notice, setNotice] = useState('Curated works, social layers, and creator tools are ready.');
    const [loading, setLoading] = useState(true);
    const [workForm, setWorkForm] = useState(initialWorkForm);
    const [collectionForm, setCollectionForm] = useState(initialCollectionForm);
    const [profileForm, setProfileForm] = useState(initialProfileForm);
    const [authForm, setAuthForm] = useState(initialAuthForm);
    const [loginForm, setLoginForm] = useState(initialLoginForm);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [authMode, setAuthMode] = useState('signup');
    const [resetEmail, setResetEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [resetPassword, setResetPassword] = useState('');
    const [googleToken, setGoogleToken] = useState('');
    const [refreshBusy, setRefreshBusy] = useState(false);
    const savedWorkIds = useMemo(() => new Set((saved?.works ?? []).map((item) => item.id)), [saved]);
    const followingIds = useMemo(() => new Set(following.map((person) => person.id)), [following]);
    const filteredUsers = useMemo(() => users.filter((person) => person.id !== session?.user.id), [users, session?.user.id]);
    useEffect(() => {
        saveSession(session);
    }, [session]);
    useEffect(() => {
        const onPop = () => setRoute(window.location.pathname || '/');
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);
    useEffect(() => {
        if (route === '/profile' && !session) {
            navigate('/signin');
            return;
        }
        if (route === '/profile' && session) {
            setActiveView('profile');
            return;
        }
        if (route === '/explore') {
            setActiveView('explore');
        }
    }, [route, session]);
    useEffect(() => {
        if (route !== '/auth/google/callback') {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        const payload = params.get('payload');
        if (!payload) {
            setNotice('Google sign-in completed, but no session payload was returned.');
            navigate('/signin');
            return;
        }
        try {
            const parsed = JSON.parse(decodeURIComponent(payload));
            const token = parsed.accessToken;
            if (!token || !parsed.user) {
                throw new Error('Google sign-in did not return a valid session.');
            }
            const nextSession = { token, refreshToken: parsed.refreshToken, user: parsed.user };
            setSession(nextSession);
            setNotice(`Signed in with Google as ${parsed.user.username}.`);
            window.history.replaceState({}, '', '/profile');
            setRoute('/profile');
            setActiveView('profile');
        }
        catch (error) {
            setNotice(error instanceof Error ? error.message : 'Google sign-in callback failed.');
            navigate('/signin');
        }
    }, [route]);
    function navigate(path) {
        if (path === route)
            return;
        window.history.pushState({}, '', path);
        setRoute(path);
    }
    useEffect(() => {
        const loadPublicData = async () => {
            try {
                setLoading(true);
                const query = new URLSearchParams();
                query.set('limit', '24');
                query.set('page', '1');
                if (search.trim())
                    query.set('search', search.trim());
                if (category)
                    query.set('category', category);
                if (sortBy)
                    query.set('sortBy', sortBy);
                if (sortOrder)
                    query.set('sortOrder', sortOrder);
                const [worksResponse, usersResponse] = await Promise.all([
                    apiRequest(`/api/artworks?${query.toString()}`),
                    apiRequest('/api/users?limit=12&page=1')
                ]);
                setWorks(worksResponse.works);
                setPagination(worksResponse.pagination);
                setUsers(usersResponse.users);
            }
            catch (error) {
                setNotice(error instanceof Error ? error.message : 'Failed to load gallery content.');
            }
            finally {
                setLoading(false);
            }
        };
        void loadPublicData();
    }, [search, category, sortBy, sortOrder]);
    useEffect(() => {
        const loadAuthenticatedData = async () => {
            if (!session) {
                setDashboard(null);
                setRecommendations([]);
                setSaved(null);
                setFollowers([]);
                setFollowing([]);
                setProfileForm(initialProfileForm);
                return;
            }
            try {
                const [dashboardResponse, recommendationsResponse, savedResponse, followersResponse, followingResponse] = await Promise.all([
                    apiRequest(`/api/users/${session.user.id}/dashboard`, { token: session.token }),
                    apiRequest(`/api/feed/recommendations`, { token: session.token }),
                    apiRequest(`/api/saved`, { token: session.token }),
                    apiRequest(`/api/follow/followers/${session.user.id}`, { token: session.token }),
                    apiRequest(`/api/follow/following/${session.user.id}`, { token: session.token })
                ]);
                setDashboard(dashboardResponse);
                setRecommendations(recommendationsResponse);
                setSaved(savedResponse);
                setFollowers(followersResponse.followers ?? []);
                setFollowing(followingResponse.following ?? []);
                const profile = dashboardResponse.profile ?? session.user;
                setProfileForm({
                    username: profile.username ?? '',
                    firstName: profile.firstName ?? '',
                    lastName: profile.lastName ?? '',
                    bio: profile.bio ?? '',
                    website: profile.website ?? '',
                    avatarUrl: profile.avatarUrl ?? ''
                });
                setActiveView('explore');
            }
            catch (error) {
                setNotice(error instanceof Error ? error.message : 'Failed to load account data.');
            }
        };
        void loadAuthenticatedData();
    }, [session]);
    async function handleSignup(event) {
        event.preventDefault();
        try {
            const response = await apiRequest('/api/auth/signup', {
                method: 'POST',
                body: authForm
            });
            if (response.verifyUrl) {
                setNotice(`Signup created. Verify via the preview link: ${response.verifyUrl}`);
                setAuthMode('login');
                return;
            }
            const token = response.accessToken ?? response.token;
            if (token && response.user) {
                const nextSession = { token, refreshToken: response.refreshToken, user: response.user };
                setSession(nextSession);
                setNotice(`Welcome, ${response.user.username}. Your gallery is ready.`);
                setActiveView('profile');
            }
        }
        catch (error) {
            setNotice(error instanceof Error ? error.message : 'Signup failed.');
        }
    }
    async function handleLogin(event) {
        event.preventDefault();
        try {
            const response = await apiRequest('/api/auth/login', {
                method: 'POST',
                body: loginForm
            });
            const token = response.accessToken ?? response.token;
            if (!token || !response.user) {
                throw new Error('Login did not return an access token.');
            }
            setSession({ token, refreshToken: response.refreshToken, user: response.user });
            setNotice(`Signed in as ${response.user.username}.`);
            setActiveView('explore');
        }
        catch (error) {
            setNotice(error instanceof Error ? error.message : 'Login failed.');
        }
    }
    async function handleGoogleSignIn(event) {
        event.preventDefault();
        try {
            const response = await apiRequest('/api/auth/google', {
                method: 'POST',
                body: { id_token: googleToken }
            });
            const token = response.accessToken ?? response.token;
            if (!token || !response.user) {
                throw new Error('Google sign-in did not return an access token.');
            }
            setSession({ token, refreshToken: response.refreshToken, user: response.user });
            setNotice(`Signed in with Google as ${response.user.username}.`);
            setActiveView('explore');
        }
        catch (error) {
            setNotice(error instanceof Error ? error.message : 'Google sign-in failed.');
        }
    }
    async function handleRefresh() {
        if (!session?.refreshToken) {
            setNotice('No refresh token stored.');
            return;
        }
        try {
            setRefreshBusy(true);
            const response = await apiRequest('/api/auth/refresh', {
                method: 'POST',
                body: { refreshToken: session.refreshToken }
            });
            const token = response.accessToken ?? response.token;
            if (!token) {
                throw new Error('Refresh failed.');
            }
            setSession({ ...session, token, refreshToken: response.refreshToken ?? session.refreshToken });
            setNotice('Session refreshed successfully.');
        }
        catch (error) {
            setNotice(error instanceof Error ? error.message : 'Refresh failed.');
        }
        finally {
            setRefreshBusy(false);
        }
    }
    async function handleLogout() {
        try {
            if (session?.refreshToken) {
                await apiRequest('/api/auth/logout', {
                    method: 'POST',
                    body: { refreshToken: session.refreshToken }
                });
            }
        }
        catch {
            // ignore logout errors and clear local state anyway
        }
        finally {
            setSession(null);
            setDashboard(null);
            setRecommendations([]);
            setSaved(null);
            setFollowers([]);
            setFollowing([]);
            setNotice('Logged out.');
            setActiveView('explore');
        }
    }
    async function handleCreateWork(event) {
        event.preventDefault();
        if (!session) {
            setNotice('Sign in before creating works.');
            return;
        }
        try {
            await apiRequest('/api/works', {
                method: 'POST',
                token: session.token,
                body: {
                    title: workForm.title,
                    description: workForm.description,
                    category: workForm.category,
                    fileUrl: workForm.fileUrl,
                    tags: workForm.tags
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean)
                }
            });
            setWorkForm(initialWorkForm);
            setNotice('Artwork published. Refreshing the gallery...');
            setActiveView('explore');
            const query = new URLSearchParams();
            query.set('limit', '24');
            query.set('page', '1');
            const worksResponse = await apiRequest(`/api/artworks?${query.toString()}`);
            setWorks(worksResponse.works);
            setPagination(worksResponse.pagination);
        }
        catch (error) {
            setNotice(error instanceof Error ? error.message : 'Failed to publish artwork.');
        }
    }
    async function handleCreateCollection(event) {
        event.preventDefault();
        if (!session) {
            setNotice('Sign in before creating collections.');
            return;
        }
        try {
            await apiRequest('/api/collections', {
                method: 'POST',
                token: session.token,
                body: collectionForm
            });
            setCollectionForm(initialCollectionForm);
            setNotice('Collection created successfully.');
            const dashboardResponse = await apiRequest(`/api/users/${session.user.id}/dashboard`, { token: session.token });
            setDashboard(dashboardResponse);
        }
        catch (error) {
            setNotice(error instanceof Error ? error.message : 'Failed to create collection.');
        }
    }
    async function handleSaveToggle(workId) {
        if (!session) {
            setNotice('Sign in to save artworks.');
            return;
        }
        try {
            if (savedWorkIds.has(workId)) {
                await apiRequest(`/api/saved/works/${workId}`, { method: 'DELETE', token: session.token });
                setNotice('Artwork removed from your library.');
            }
            else {
                await apiRequest(`/api/saved/works/${workId}`, { method: 'POST', token: session.token });
                setNotice('Artwork saved to your library.');
            }
            const savedResponse = await apiRequest('/api/saved', { token: session.token });
            setSaved(savedResponse);
        }
        catch (error) {
            setNotice(error instanceof Error ? error.message : 'Failed to update saved items.');
        }
    }
    async function handleLike(workId) {
        if (!session) {
            setNotice('Sign in to like artworks.');
            return;
        }
        try {
            await apiRequest(`/api/works/${workId}/like`, { method: 'POST', token: session.token });
            setNotice('Like updated.');
            const [worksResponse, dashboardResponse] = await Promise.all([
                apiRequest(`/api/artworks?limit=24&page=1${search ? `&search=${encodeURIComponent(search)}` : ''}${category ? `&category=${encodeURIComponent(category)}` : ''}&sortBy=${sortBy}&sortOrder=${sortOrder}`),
                apiRequest(`/api/users/${session.user.id}/dashboard`, { token: session.token })
            ]);
            setWorks(worksResponse.works);
            setPagination(worksResponse.pagination);
            setDashboard(dashboardResponse);
        }
        catch (error) {
            setNotice(error instanceof Error ? error.message : 'Failed to update like.');
        }
    }
    async function handleFollow(userId) {
        if (!session) {
            setNotice('Sign in to follow creators.');
            return;
        }
        try {
            if (followingIds.has(userId)) {
                await apiRequest(`/api/follow/${userId}`, { method: 'DELETE', token: session.token });
                setNotice('Creator unfollowed.');
            }
            else {
                await apiRequest(`/api/follow/${userId}`, { method: 'POST', token: session.token });
                setNotice('Creator followed.');
            }
            const [followersResponse, followingResponse] = await Promise.all([
                apiRequest(`/api/follow/followers/${session.user.id}`, { token: session.token }),
                apiRequest(`/api/follow/following/${session.user.id}`, { token: session.token })
            ]);
            setFollowers(followersResponse.followers ?? []);
            setFollowing(followingResponse.following ?? []);
        }
        catch (error) {
            setNotice(error instanceof Error ? error.message : 'Failed to update follow state.');
        }
    }
    async function handleVerifyReset() {
        try {
            await apiRequest('/api/auth/reset-password', {
                method: 'POST',
                body: { token: resetToken, newPassword: resetPassword }
            });
            setNotice('Password reset complete. You can log in with the new password.');
            setResetToken('');
            setResetPassword('');
        }
        catch (error) {
            setNotice(error instanceof Error ? error.message : 'Password reset failed.');
        }
    }
    async function handleRequestReset() {
        try {
            const response = await apiRequest('/api/auth/request-password-reset', {
                method: 'POST',
                body: { email: resetEmail }
            });
            setNotice(response.resetUrl ? `Password reset preview: ${response.resetUrl}` : 'Password reset email requested.');
        }
        catch (error) {
            setNotice(error instanceof Error ? error.message : 'Password reset request failed.');
        }
    }
    async function handleProfileUpdate(event) {
        event.preventDefault();
        if (!session) {
            setNotice('Sign in to update your profile.');
            return;
        }
        try {
            const response = await apiRequest(`/api/users/${session.user.id}`, {
                method: 'PUT',
                token: session.token,
                body: profileForm
            });
            const updatedUser = response.user;
            const nextSession = { ...session, user: updatedUser };
            setSession(nextSession);
            setNotice('Profile updated successfully.');
        }
        catch (error) {
            setNotice(error instanceof Error ? error.message : 'Profile update failed.');
        }
    }
    function openWork(work) {
        setSelectedWork(work);
    }
    const profile = dashboard?.profile ?? session?.user ?? null;
    const totalCreators = filteredUsers.length;
    const totalSaved = saved?.works.length ?? 0;
    const totalCollections = dashboard?.collections.length ?? 0;
    const totalFollowers = followers.length;
    const totalFollowing = following.length;
    if (route === '/profile' && !session) {
        return _jsx(SignIn, { onDone: (s) => { setSession(s); navigate('/profile'); }, onCancel: () => navigate('/') });
    }
    if (route === '/auth/google/callback') {
        return (_jsx("div", { className: "auth-page", children: _jsxs("div", { className: "auth-card panel glass", children: [_jsx("h2", { children: "Completing Google sign-in" }), _jsx("p", { className: "meta", children: "Hold tight while we finish connecting your Google account." })] }) }));
    }
    // route handling: simple pathname-based router
    if (route === '/') {
        return _jsx(Landing, { onExplore: () => { navigate('/explore'); setActiveView('explore'); }, onProfile: () => { if (session) {
                navigate('/profile');
                setActiveView('profile');
            }
            else {
                navigate('/signin');
            } }, onSignIn: () => navigate('/signin'), onSignUp: () => navigate('/signup'), session: session });
    }
    if (route === '/signin') {
        return _jsx(SignIn, { onDone: (s) => { setSession(s); navigate('/profile'); }, onCancel: () => navigate('/') });
    }
    if (route === '/signup') {
        return _jsx(SignUp, { onDone: (s) => { setSession(s); navigate('/profile'); }, onCancel: () => navigate('/') });
    }
    return (_jsxs("div", { className: "app-shell", children: [_jsx("div", { className: "ambient ambient-one" }), _jsx("div", { className: "ambient ambient-two" }), _jsxs("aside", { className: "sidebar glass", children: [_jsxs("div", { children: [_jsx("div", { className: "brand-mark", children: "GH" }), _jsxs("div", { className: "sidebar-copy", children: [_jsx("p", { className: "eyebrow", children: "Grand Gallery" }), _jsx("h1", { children: "Gallery of Wonders" }), _jsx("p", { children: "Explore the feed, save favorites, follow creators, and publish your own work." })] })] }), _jsx("nav", { className: "nav-stack", children: [
                            ['explore', 'Explore'],
                            ['studio', 'Studio'],
                            ['library', 'Library'],
                            ['community', 'Community'],
                            ['profile', 'Profile']
                        ].map(([key, label]) => (_jsx("button", { type: "button", className: `nav-item ${activeView === key ? 'is-active' : ''}`, onClick: () => setActiveView(key), children: label }, key))) }), _jsxs("div", { className: "sidebar-footer", children: [_jsx(StatCard, { label: "Creators", value: totalCreators, tone: "violet" }), _jsx(StatCard, { label: "Saved Works", value: totalSaved, tone: "gold" })] })] }), _jsxs("main", { className: "main-stage", children: [_jsxs("section", { className: "hero glass", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Creative social platform" }), _jsx("h2", { children: "Build, collect, and follow the best of your gallery." }), _jsx("p", { className: "hero-text", children: "A polished frontend for exploring artworks, managing collections, tracking creators, and using your backend as the source of truth." })] }), _jsxs("div", { className: "hero-actions", children: [_jsx(StatCard, { label: "Works", value: pagination?.totalWorks ?? works.length, tone: "aqua" }), _jsx(StatCard, { label: "Interactions", value: dashboard?.stats.totalInteractions ?? 0, tone: "rose" }), _jsx(StatCard, { label: "Followers", value: totalFollowers, tone: "gold" })] })] }), _jsx("div", { className: "notice-bar glass", children: notice }), activeView === 'explore' && (_jsxs("section", { className: "content-grid", children: [_jsxs("div", { className: "content-column wide", children: [_jsxs("div", { className: "toolbar glass", children: [_jsx("input", { className: "field field-search", placeholder: "Search artworks, tags, creators...", value: search, onChange: (event) => setSearch(event.target.value) }), _jsxs("select", { className: "field", value: category, onChange: (event) => setCategory(event.target.value), children: [_jsx("option", { value: "", children: "All categories" }), _jsx("option", { value: "ART", children: "Art" }), _jsx("option", { value: "PHOTO", children: "Photography" }), _jsx("option", { value: "WRITING", children: "Writing" }), _jsx("option", { value: "AUDIO", children: "Audio" }), _jsx("option", { value: "VIDEO", children: "Video" }), _jsx("option", { value: "OTHER", children: "Other" })] }), _jsxs("select", { className: "field", value: sortBy, onChange: (event) => setSortBy(event.target.value), children: [_jsx("option", { value: "createdAt", children: "Newest" }), _jsx("option", { value: "updatedAt", children: "Recently updated" }), _jsx("option", { value: "title", children: "Title" }), _jsx("option", { value: "price", children: "Price" })] }), _jsxs("select", { className: "field", value: sortOrder, onChange: (event) => setSortOrder(event.target.value), children: [_jsx("option", { value: "desc", children: "Descending" }), _jsx("option", { value: "asc", children: "Ascending" })] })] }), _jsx(SectionTitle, { eyebrow: "Curated feed", title: "Artworks", subtitle: loading ? 'Loading the latest works...' : 'Browse public artworks straight from your backend.' }), _jsx("div", { className: "art-grid", children: works.map((work) => (_jsxs("article", { className: "art-card glass", children: [_jsx("button", { type: "button", className: "art-preview", onClick: () => openWork(work), children: _jsx("img", { src: work.fileUrl, alt: work.title }) }), _jsxs("div", { className: "art-body", children: [_jsxs("div", { className: "art-topline", children: [_jsxs("div", { children: [_jsx("p", { className: "category-label", children: work.category }), _jsx("h3", { children: work.title })] }), _jsx("div", { className: "art-price", children: formatMoney(work.price) })] }), _jsx("p", { className: "art-description", children: work.description }), _jsx("div", { className: "tag-row", children: getTags(work).slice(0, 4).map((tag) => (_jsx(Badge, { children: tag }, tag))) }), _jsxs("div", { className: "meta-row", children: [_jsxs("div", { className: "meta-author", children: [_jsx(Avatar, { label: work.author?.username ?? 'A' }), _jsxs("div", { children: [_jsx("strong", { children: work.author?.username ?? 'Unknown creator' }), _jsx("span", { children: new Date(work.createdAt ?? Date.now()).toLocaleDateString() })] })] }), _jsxs("span", { className: "likes-chip", children: [work.likesCount ?? work.interactions?.length ?? 0, " likes"] })] }), _jsxs("div", { className: "action-row", children: [_jsx("button", { type: "button", className: "ghost-btn", onClick: () => void handleLike(work.id), children: "Like" }), _jsx("button", { type: "button", className: "ghost-btn", onClick: () => void handleSaveToggle(work.id), children: savedWorkIds.has(work.id) ? 'Saved' : 'Save' }), _jsx("button", { type: "button", className: "primary-btn", onClick: () => openWork(work), children: "View" })] })] })] }, work.id))) }), works.length === 0 && !loading && (_jsx("div", { className: "empty-state glass", children: "No artworks matched your filters yet." }))] }), _jsxs("aside", { className: "content-column side", children: [_jsxs("div", { className: "panel glass", children: [_jsx(SectionTitle, { eyebrow: "Recommendations", title: "Your feed", subtitle: "Personalized selections from the backend recommendation endpoint." }), _jsxs("div", { className: "stack", children: [recommendations.slice(0, 6).map((item) => (_jsxs("button", { className: "mini-card", type: "button", onClick: () => openWork(item.work), children: [_jsxs("div", { children: [_jsx("strong", { children: item.work.title }), _jsx("span", { children: item.work.category })] }), _jsx(Badge, { children: item.score.toFixed(1) })] }, item.work.id))), recommendations.length === 0 && _jsx("div", { className: "empty-inline", children: "Sign in to unlock recommendations." })] })] }), _jsxs("div", { className: "panel glass", children: [_jsx(SectionTitle, { eyebrow: "Profile snapshot", title: displayName(profile), subtitle: "Your current account state." }), profile ? (_jsxs("div", { className: "profile-card", children: [_jsx(Avatar, { label: profile.username }), _jsxs("div", { children: [_jsxs("strong", { children: ["@", profile.username] }), _jsx("p", { children: profile.bio || 'No bio yet.' })] })] })) : (_jsx("div", { className: "empty-inline", children: "Sign in to sync your profile." })), _jsxs("div", { className: "mini-stats", children: [_jsx(StatCard, { label: "Collections", value: totalCollections, tone: "violet" }), _jsx(StatCard, { label: "Following", value: totalFollowing, tone: "aqua" })] })] })] })] })), activeView === 'studio' && (_jsxs("section", { className: "content-grid", children: [_jsxs("div", { className: "content-column wide", children: [_jsx(SectionTitle, { eyebrow: "Creator studio", title: "Publish work", subtitle: "Use your backend to create a new artwork entry." }), _jsxs("form", { className: "panel glass form-grid", onSubmit: handleCreateWork, children: [_jsx("input", { className: "field", placeholder: "Title", value: workForm.title, onChange: (event) => setWorkForm({ ...workForm, title: event.target.value }) }), _jsx("input", { className: "field", placeholder: "Image URL", value: workForm.fileUrl, onChange: (event) => setWorkForm({ ...workForm, fileUrl: event.target.value }) }), _jsxs("select", { className: "field", value: workForm.category, onChange: (event) => setWorkForm({ ...workForm, category: event.target.value }), children: [_jsx("option", { value: "ART", children: "Art" }), _jsx("option", { value: "PHOTO", children: "Photography" }), _jsx("option", { value: "WRITING", children: "Writing" }), _jsx("option", { value: "AUDIO", children: "Audio" }), _jsx("option", { value: "VIDEO", children: "Video" }), _jsx("option", { value: "OTHER", children: "Other" })] }), _jsx("textarea", { className: "field field-textarea full", placeholder: "Description", value: workForm.description, onChange: (event) => setWorkForm({ ...workForm, description: event.target.value }) }), _jsx("input", { className: "field full", placeholder: "Tags, comma separated", value: workForm.tags, onChange: (event) => setWorkForm({ ...workForm, tags: event.target.value }) }), _jsx("button", { className: "primary-btn full", type: "submit", children: "Publish artwork" })] }), _jsx(SectionTitle, { eyebrow: "Collections", title: "Create collection", subtitle: "Group works and keep your gallery organized." }), _jsxs("form", { className: "panel glass form-grid", onSubmit: handleCreateCollection, children: [_jsx("input", { className: "field", placeholder: "Collection title", value: collectionForm.title, onChange: (event) => setCollectionForm({ ...collectionForm, title: event.target.value }) }), _jsx("input", { className: "field", placeholder: "Description", value: collectionForm.description, onChange: (event) => setCollectionForm({ ...collectionForm, description: event.target.value }) }), _jsxs("label", { className: "checkbox-row full", children: [_jsx("input", { type: "checkbox", checked: collectionForm.isCollaborative, onChange: (event) => setCollectionForm({ ...collectionForm, isCollaborative: event.target.checked }) }), "Collaborative collection"] }), _jsx("button", { className: "primary-btn full", type: "submit", children: "Create collection" })] })] }), _jsxs("aside", { className: "content-column side", children: [_jsxs("div", { className: "panel glass", children: [_jsx(SectionTitle, { eyebrow: "Dashboard", title: "Your stats", subtitle: "Pulled from /api/users/:id/dashboard." }), _jsxs("div", { className: "stat-grid", children: [_jsx(StatCard, { label: "Works", value: dashboard?.stats.totalWorks ?? 0, tone: "aqua" }), _jsx(StatCard, { label: "Likes", value: dashboard?.stats.totalLikes ?? 0, tone: "rose" }), _jsx(StatCard, { label: "Views", value: dashboard?.stats.totalViews ?? 0, tone: "gold" }), _jsx(StatCard, { label: "Interactions", value: dashboard?.stats.totalInteractions ?? 0, tone: "violet" })] })] }), _jsxs("div", { className: "panel glass", children: [_jsx(SectionTitle, { eyebrow: "Recent", title: "Your works", subtitle: "Latest creations in your dashboard." }), _jsxs("div", { className: "stack", children: [(dashboard?.works ?? []).slice(0, 5).map((work) => (_jsxs("button", { className: "mini-card", type: "button", onClick: () => openWork(work), children: [_jsxs("div", { children: [_jsx("strong", { children: work.title }), _jsx("span", { children: work.category })] }), _jsxs(Badge, { children: [work.likesCount ?? 0, " likes"] })] }, work.id))), (dashboard?.works ?? []).length === 0 && _jsx("div", { className: "empty-inline", children: "Your published work will appear here." })] })] })] })] })), activeView === 'library' && (_jsxs("section", { className: "content-grid", children: [_jsxs("div", { className: "content-column wide", children: [_jsx(SectionTitle, { eyebrow: "Saved", title: "Your library", subtitle: "Everything you saved from the gallery." }), _jsx("div", { className: "art-grid compact", children: (saved?.works ?? []).map((work) => (_jsxs("article", { className: "art-card glass compact-card", children: [_jsx("button", { type: "button", className: "art-preview", onClick: () => openWork(work), children: _jsx("img", { src: work.fileUrl, alt: work.title }) }), _jsxs("div", { className: "art-body", children: [_jsx("h3", { children: work.title }), _jsx("p", { className: "art-description", children: work.description }), _jsxs("div", { className: "action-row", children: [_jsx("button", { type: "button", className: "ghost-btn", onClick: () => void handleSaveToggle(work.id), children: "Remove" }), _jsx("button", { type: "button", className: "primary-btn", onClick: () => openWork(work), children: "Open" })] })] })] }, work.id))) }), (saved?.works ?? []).length === 0 && _jsx("div", { className: "empty-state glass", children: "Save artworks to build a library here." })] }), _jsx("aside", { className: "content-column side", children: _jsxs("div", { className: "panel glass", children: [_jsx(SectionTitle, { eyebrow: "Collections", title: "Saved collections", subtitle: "Collections you collected for later." }), _jsxs("div", { className: "stack", children: [(saved?.collections ?? []).map((collection) => (_jsxs("div", { className: "mini-card static-card", children: [_jsxs("div", { children: [_jsx("strong", { children: collection.title }), _jsx("span", { children: collection.description })] }), _jsx(Badge, { children: collection.isCollaborative ? 'Collaborative' : 'Private' })] }, collection.id))), (saved?.collections ?? []).length === 0 && _jsx("div", { className: "empty-inline", children: "No saved collections yet." })] })] }) })] })), activeView === 'community' && (_jsxs("section", { className: "content-grid", children: [_jsxs("div", { className: "content-column wide", children: [_jsx(SectionTitle, { eyebrow: "Creators", title: "Community", subtitle: "Discover and follow people using your backend social graph." }), _jsx("div", { className: "user-grid", children: filteredUsers.map((user) => {
                                            const isFollowing = followingIds.has(user.id);
                                            return (_jsxs("article", { className: "user-card glass", children: [_jsxs("div", { className: "profile-card", children: [_jsx(Avatar, { label: user.username }), _jsxs("div", { children: [_jsx("strong", { children: displayName(user) }), _jsxs("p", { children: ["@", user.username] })] })] }), _jsxs("div", { className: "action-row", children: [_jsx("button", { type: "button", className: isFollowing ? 'ghost-btn active' : 'ghost-btn', onClick: () => void handleFollow(user.id), children: isFollowing ? 'Following' : 'Follow' }), _jsx("button", { type: "button", className: "primary-btn", onClick: () => setActiveView('profile'), children: "Profile" })] })] }, user.id));
                                        }) })] }), _jsx("aside", { className: "content-column side", children: _jsxs("div", { className: "panel glass", children: [_jsx(SectionTitle, { eyebrow: "Network", title: "Followers / following", subtitle: "Counts from the social endpoints." }), _jsxs("div", { className: "stat-grid", children: [_jsx(StatCard, { label: "Followers", value: followers.length, tone: "aqua" }), _jsx(StatCard, { label: "Following", value: following.length, tone: "violet" })] })] }) })] })), activeView === 'profile' && (_jsxs("section", { className: "content-grid", children: [_jsxs("div", { className: "content-column wide", children: [_jsx(SectionTitle, { eyebrow: "Account", title: "Profile", subtitle: "Update your profile and manage authentication." }), session ? (_jsxs(_Fragment, { children: [_jsxs("form", { className: "panel glass form-grid", onSubmit: handleProfileUpdate, children: [_jsx("input", { className: "field", placeholder: "Username", value: profileForm.username, onChange: (event) => setProfileForm({ ...profileForm, username: event.target.value }) }), _jsx("input", { className: "field", placeholder: "First name", value: profileForm.firstName, onChange: (event) => setProfileForm({ ...profileForm, firstName: event.target.value }) }), _jsx("input", { className: "field", placeholder: "Last name", value: profileForm.lastName, onChange: (event) => setProfileForm({ ...profileForm, lastName: event.target.value }) }), _jsx("input", { className: "field", placeholder: "Website", value: profileForm.website, onChange: (event) => setProfileForm({ ...profileForm, website: event.target.value }) }), _jsx("input", { className: "field full", placeholder: "Avatar URL", value: profileForm.avatarUrl, onChange: (event) => setProfileForm({ ...profileForm, avatarUrl: event.target.value }) }), _jsx("textarea", { className: "field field-textarea full", placeholder: "Bio", value: profileForm.bio, onChange: (event) => setProfileForm({ ...profileForm, bio: event.target.value }) }), _jsx("button", { className: "primary-btn full", type: "submit", children: "Update profile" })] }), _jsxs("div", { className: "profile-summary glass", children: [_jsxs("div", { className: "profile-card large", children: [_jsx(Avatar, { label: profile?.username ?? session.user.username }), _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Signed in" }), _jsx("strong", { children: displayName(profile) }), _jsxs("span", { children: ["@", profile?.username ?? session.user.username] })] })] }), _jsxs("div", { className: "mini-stats", children: [_jsx(StatCard, { label: "Access token", value: `${session.token.slice(0, 10)}…`, tone: "aqua" }), _jsx(StatCard, { label: "Refresh token", value: session.refreshToken ? 'Stored' : 'Missing', tone: "gold" })] }), _jsxs("div", { className: "action-row wrap", children: [_jsx("button", { className: "ghost-btn", type: "button", onClick: () => void handleRefresh(), disabled: refreshBusy, children: refreshBusy ? 'Refreshing…' : 'Refresh session' }), _jsx("button", { className: "ghost-btn danger", type: "button", onClick: () => void handleLogout(), children: "Logout" })] })] })] })) : (_jsxs("div", { className: "panel glass auth-grid", children: [_jsxs("div", { className: "auth-card", children: [_jsxs("div", { className: "toggle-row", children: [_jsx("button", { type: "button", className: authMode === 'signup' ? 'pill active' : 'pill', onClick: () => setAuthMode('signup'), children: "Signup" }), _jsx("button", { type: "button", className: authMode === 'login' ? 'pill active' : 'pill', onClick: () => setAuthMode('login'), children: "Login" })] }), authMode === 'signup' ? (_jsxs("form", { className: "stack form-stack", onSubmit: handleSignup, children: [_jsx("input", { className: "field", placeholder: "Username", value: authForm.username, onChange: (event) => setAuthForm({ ...authForm, username: event.target.value }) }), _jsx("input", { className: "field", placeholder: "Email", type: "email", value: authForm.email, onChange: (event) => setAuthForm({ ...authForm, email: event.target.value }) }), _jsx("input", { className: "field", placeholder: "Password", type: "password", value: authForm.password, onChange: (event) => setAuthForm({ ...authForm, password: event.target.value }) }), _jsx("button", { className: "primary-btn full", type: "submit", children: "Create account" })] })) : (_jsxs("form", { className: "stack form-stack", onSubmit: handleLogin, children: [_jsx("input", { className: "field", placeholder: "Email", type: "email", value: loginForm.email, onChange: (event) => setLoginForm({ ...loginForm, email: event.target.value }) }), _jsx("input", { className: "field", placeholder: "Password", type: "password", value: loginForm.password, onChange: (event) => setLoginForm({ ...loginForm, password: event.target.value }) }), _jsx("button", { className: "primary-btn full", type: "submit", children: "Sign in" })] }))] }), _jsxs("div", { className: "auth-card", children: [_jsxs("form", { className: "stack form-stack", onSubmit: handleGoogleSignIn, children: [_jsx("h3", { children: "Google sign-in" }), _jsx("input", { className: "field", placeholder: "Paste Google id_token", value: googleToken, onChange: (event) => setGoogleToken(event.target.value) }), _jsx("button", { className: "ghost-btn full", type: "submit", children: "Sign in with Google" })] }), _jsxs("div", { className: "stack form-stack", children: [_jsx("h3", { children: "Password reset" }), _jsx("input", { className: "field", placeholder: "Email", type: "email", value: resetEmail, onChange: (event) => setResetEmail(event.target.value) }), _jsx("div", { className: "action-row wrap", children: _jsx("button", { className: "ghost-btn", type: "button", onClick: () => void handleRequestReset(), children: "Request reset" }) }), _jsx("input", { className: "field", placeholder: "Reset token", value: resetToken, onChange: (event) => setResetToken(event.target.value) }), _jsx("input", { className: "field", placeholder: "New password", type: "password", value: resetPassword, onChange: (event) => setResetPassword(event.target.value) }), _jsx("button", { className: "primary-btn full", type: "button", onClick: () => void handleVerifyReset(), children: "Submit new password" })] })] })] }))] }), _jsx("aside", { className: "content-column side", children: _jsxs("div", { className: "panel glass", children: [_jsx(SectionTitle, { eyebrow: "Status", title: "Account details", subtitle: "Useful state from the backend session." }), session ? (_jsxs("div", { className: "stack", children: [_jsxs("div", { className: "mini-card static-card", children: [_jsxs("div", { children: [_jsx("strong", { children: session.user.username }), _jsx("span", { children: session.user.email })] }), _jsx(Badge, { children: session.user.role ?? 'user' })] }), _jsxs("div", { className: "mini-card static-card", children: [_jsxs("div", { children: [_jsx("strong", { children: "Email" }), _jsx("span", { children: session.user.isVerified ? 'Verified' : 'Unverified' })] }), _jsx(Badge, { children: session.user.isActive === false ? 'Inactive' : 'Active' })] })] })) : (_jsx("div", { className: "empty-inline", children: "Create an account or sign in to unlock the full experience." }))] }) })] }))] }), selectedWork && (_jsx("div", { className: "modal-backdrop", onClick: () => setSelectedWork(null), children: _jsxs("div", { className: "modal glass", onClick: (event) => event.stopPropagation(), children: [_jsx("button", { type: "button", className: "close-btn", onClick: () => setSelectedWork(null), children: "\u00D7" }), _jsx("img", { src: selectedWork.fileUrl, alt: selectedWork.title, className: "modal-image" }), _jsxs("div", { className: "modal-body", children: [_jsx("p", { className: "eyebrow", children: "Artwork detail" }), _jsx("h3", { children: selectedWork.title }), _jsx("p", { children: selectedWork.description }), _jsx("div", { className: "tag-row", children: getTags(selectedWork).map((tag) => (_jsx(Badge, { children: tag }, tag))) }), _jsxs("div", { className: "action-row wrap", children: [_jsx("button", { type: "button", className: "ghost-btn", onClick: () => void handleLike(selectedWork.id), children: "Like" }), _jsx("button", { type: "button", className: "ghost-btn", onClick: () => void handleSaveToggle(selectedWork.id), children: savedWorkIds.has(selectedWork.id) ? 'Remove save' : 'Save' })] })] })] }) }))] }));
}
