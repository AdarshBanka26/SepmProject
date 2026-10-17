import { type ReactNode, FormEvent, useEffect, useMemo, useState } from 'react';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import { API_BASE_URL, AUTH_STORAGE_KEY } from './config';

type SessionUser = {
  id: string;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  website?: string | null;
  role?: string;
  isActive?: boolean;
  isVerified?: boolean;
  createdAt?: string;
};

type AuthSession = {
  token: string;
  refreshToken?: string;
  user: SessionUser;
};

type Artwork = {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  category: string;
  isPublic?: boolean;
  status?: string;
  price?: number;
  tags?: unknown;
  createdAt?: string;
  updatedAt?: string;
  author?: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
  likesCount?: number;
  interactions?: Array<{ id: string }>;
};

type Collection = {
  id: string;
  title: string;
  description: string;
  isCollaborative?: boolean;
  createdAt?: string;
  owner?: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
};

type Dashboard = {
  profile: SessionUser | null;
  works: Artwork[];
  collections: Collection[];
  stats: {
    totalWorks: number;
    totalInteractions: number;
    totalLikes: number;
    totalViews: number;
  };
};

type Recommendation = {
  work: Artwork;
  score: number;
};

type UsersResponse = {
  users: Array<{
    id: string;
    username: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
    role?: string;
    createdAt?: string;
  }>;
};

type SavedResponse = {
  works: Artwork[];
  collections: Collection[];
};

type WorksResponse = {
  works: Artwork[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalWorks: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

type AuthResponse = {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: SessionUser;
  verifyUrl?: string;
  resetUrl?: string;
  message?: string;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string;
};

type ViewKey = 'explore' | 'studio' | 'library' | 'community' | 'profile';
type SortKey = 'createdAt' | 'updatedAt' | 'title' | 'price';

type WorkForm = {
  title: string;
  description: string;
  category: string;
  fileUrl: string;
  tags: string;
};

type CollectionForm = {
  title: string;
  description: string;
  isCollaborative: boolean;
};

type ProfileForm = {
  username: string;
  firstName: string;
  lastName: string;
  bio: string;
  website: string;
  avatarUrl: string;
};

type AuthForm = {
  username: string;
  email: string;
  password: string;
};

type LoginForm = {
  email: string;
  password: string;
};

const initialAuthForm: AuthForm = { username: '', email: '', password: '' };
const initialLoginForm: LoginForm = { email: '', password: '' };
const initialWorkForm: WorkForm = {
  title: '',
  description: '',
  category: 'ART',
  fileUrl: '',
  tags: ''
};
const initialCollectionForm: CollectionForm = {
  title: '',
  description: '',
  isCollaborative: false
};
const initialProfileForm: ProfileForm = {
  username: '',
  firstName: '',
  lastName: '',
  bio: '',
  website: '',
  avatarUrl: ''
};

function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.token || !parsed?.user?.id) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function saveSession(session: AuthSession | null) {
  if (session) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getTags(work: Artwork) {
  if (!Array.isArray(work.tags)) {
    return [];
  }

  return work.tags.filter((tag): tag is string => typeof tag === 'string');
}

function formatMoney(value?: number) {
  if (typeof value !== 'number') {
    return '$0';
  }

  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function displayName(user?: { username?: string; firstName?: string | null; lastName?: string | null } | null) {
  if (!user) {
    return 'Guest';
  }

  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : user.username || 'Creator';
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    const message = isRecord(payload) ? String(payload.message ?? payload.error ?? `Request failed with ${response.status}`) : `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

function StatCard({ label, value, tone = 'aqua' }: { label: string; value: string | number; tone?: 'aqua' | 'violet' | 'gold' | 'rose' }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="section-title">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      <span>{subtitle}</span>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}

function Avatar({ label }: { label: string }) {
  return <div className="avatar">{label.slice(0, 1).toUpperCase()}</div>;
}

export default function GalleryApp() {
  const [session, setSession] = useState<AuthSession | null>(() => loadSession());
  const [route, setRoute] = useState<string>(window.location.pathname || '/');
  const [activeView, setActiveView] = useState<ViewKey>('explore');
  const [works, setWorks] = useState<Artwork[]>([]);
  const [pagination, setPagination] = useState<WorksResponse['pagination'] | null>(null);
  const [users, setUsers] = useState<UsersResponse['users']>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [saved, setSaved] = useState<SavedResponse | null>(null);
  const [followers, setFollowers] = useState<UsersResponse['users']>([]);
  const [following, setFollowing] = useState<UsersResponse['users']>([]);
  const [selectedWork, setSelectedWork] = useState<Artwork | null>(null);
  const [notice, setNotice] = useState('Curated works, social layers, and creator tools are ready.');
  const [loading, setLoading] = useState(true);
  const [workForm, setWorkForm] = useState<WorkForm>(initialWorkForm);
  const [collectionForm, setCollectionForm] = useState<CollectionForm>(initialCollectionForm);
  const [profileForm, setProfileForm] = useState<ProfileForm>(initialProfileForm);
  const [authForm, setAuthForm] = useState<AuthForm>(initialAuthForm);
  const [loginForm, setLoginForm] = useState<LoginForm>(initialLoginForm);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('createdAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
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
      const parsed = JSON.parse(decodeURIComponent(payload)) as { accessToken?: string; refreshToken?: string; user?: SessionUser };
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
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Google sign-in callback failed.');
      navigate('/signin');
    }
  }, [route]);

  function navigate(path: string) {
    if (path === route) return;
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
        if (search.trim()) query.set('search', search.trim());
        if (category) query.set('category', category);
        if (sortBy) query.set('sortBy', sortBy);
        if (sortOrder) query.set('sortOrder', sortOrder);

        const [worksResponse, usersResponse] = await Promise.all([
          apiRequest<WorksResponse>(`/api/artworks?${query.toString()}`),
          apiRequest<UsersResponse>('/api/users?limit=12&page=1')
        ]);

        setWorks(worksResponse.works);
        setPagination(worksResponse.pagination);
        setUsers(usersResponse.users);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'Failed to load gallery content.');
      } finally {
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
          apiRequest<Dashboard>(`/api/users/${session.user.id}/dashboard`, { token: session.token }),
          apiRequest<Recommendation[]>(`/api/feed/recommendations`, { token: session.token }),
          apiRequest<SavedResponse>(`/api/saved`, { token: session.token }),
          apiRequest<{ followers: UsersResponse['users'] }>(`/api/follow/followers/${session.user.id}`, { token: session.token }),
          apiRequest<{ following: UsersResponse['users'] }>(`/api/follow/following/${session.user.id}`, { token: session.token })
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
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'Failed to load account data.');
      }
    };

    void loadAuthenticatedData();
  }, [session]);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await apiRequest<AuthResponse>('/api/auth/signup', {
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
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Signup failed.');
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await apiRequest<AuthResponse>('/api/auth/login', {
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
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Login failed.');
    }
  }

  async function handleGoogleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await apiRequest<AuthResponse>('/api/auth/google', {
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
    } catch (error) {
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
      const response = await apiRequest<AuthResponse>('/api/auth/refresh', {
        method: 'POST',
        body: { refreshToken: session.refreshToken }
      });

      const token = response.accessToken ?? response.token;
      if (!token) {
        throw new Error('Refresh failed.');
      }

      setSession({ ...session, token, refreshToken: response.refreshToken ?? session.refreshToken });
      setNotice('Session refreshed successfully.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Refresh failed.');
    } finally {
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
    } catch {
      // ignore logout errors and clear local state anyway
    } finally {
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

  async function handleCreateWork(event: FormEvent<HTMLFormElement>) {
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
      const worksResponse = await apiRequest<WorksResponse>(`/api/artworks?${query.toString()}`);
      setWorks(worksResponse.works);
      setPagination(worksResponse.pagination);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to publish artwork.');
    }
  }

  async function handleCreateCollection(event: FormEvent<HTMLFormElement>) {
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
      const dashboardResponse = await apiRequest<Dashboard>(`/api/users/${session.user.id}/dashboard`, { token: session.token });
      setDashboard(dashboardResponse);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to create collection.');
    }
  }

  async function handleSaveToggle(workId: string) {
    if (!session) {
      setNotice('Sign in to save artworks.');
      return;
    }

    try {
      if (savedWorkIds.has(workId)) {
        await apiRequest(`/api/saved/works/${workId}`, { method: 'DELETE', token: session.token });
        setNotice('Artwork removed from your library.');
      } else {
        await apiRequest(`/api/saved/works/${workId}`, { method: 'POST', token: session.token });
        setNotice('Artwork saved to your library.');
      }

      const savedResponse = await apiRequest<SavedResponse>('/api/saved', { token: session.token });
      setSaved(savedResponse);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to update saved items.');
    }
  }

  async function handleLike(workId: string) {
    if (!session) {
      setNotice('Sign in to like artworks.');
      return;
    }

    try {
      await apiRequest(`/api/works/${workId}/like`, { method: 'POST', token: session.token });
      setNotice('Like updated.');
      const [worksResponse, dashboardResponse] = await Promise.all([
        apiRequest<WorksResponse>(`/api/artworks?limit=24&page=1${search ? `&search=${encodeURIComponent(search)}` : ''}${category ? `&category=${encodeURIComponent(category)}` : ''}&sortBy=${sortBy}&sortOrder=${sortOrder}`),
        apiRequest<Dashboard>(`/api/users/${session.user.id}/dashboard`, { token: session.token })
      ]);
      setWorks(worksResponse.works);
      setPagination(worksResponse.pagination);
      setDashboard(dashboardResponse);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Failed to update like.');
    }
  }

  async function handleFollow(userId: string) {
    if (!session) {
      setNotice('Sign in to follow creators.');
      return;
    }

    try {
      if (followingIds.has(userId)) {
        await apiRequest(`/api/follow/${userId}`, { method: 'DELETE', token: session.token });
        setNotice('Creator unfollowed.');
      } else {
        await apiRequest(`/api/follow/${userId}`, { method: 'POST', token: session.token });
        setNotice('Creator followed.');
      }

      const [followersResponse, followingResponse] = await Promise.all([
        apiRequest<{ followers: UsersResponse['users'] }>(`/api/follow/followers/${session.user.id}`, { token: session.token }),
        apiRequest<{ following: UsersResponse['users'] }>(`/api/follow/following/${session.user.id}`, { token: session.token })
      ]);
      setFollowers(followersResponse.followers ?? []);
      setFollowing(followingResponse.following ?? []);
    } catch (error) {
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
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Password reset failed.');
    }
  }

  async function handleRequestReset() {
    try {
      const response = await apiRequest<AuthResponse>('/api/auth/request-password-reset', {
        method: 'POST',
        body: { email: resetEmail }
      });

      setNotice(response.resetUrl ? `Password reset preview: ${response.resetUrl}` : 'Password reset email requested.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Password reset request failed.');
    }
  }

  async function handleProfileUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      setNotice('Sign in to update your profile.');
      return;
    }

    try {
      const response = await apiRequest<{ user: SessionUser }> ( `/api/users/${session.user.id}`, {
        method: 'PUT',
        token: session.token,
        body: profileForm
      });

      const updatedUser = response.user;
      const nextSession = { ...session, user: updatedUser };
      setSession(nextSession);
      setNotice('Profile updated successfully.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Profile update failed.');
    }
  }

  function openWork(work: Artwork) {
    setSelectedWork(work);
  }

  const profile = dashboard?.profile ?? session?.user ?? null;
  const totalCreators = filteredUsers.length;
  const totalSaved = saved?.works.length ?? 0;
  const totalCollections = dashboard?.collections.length ?? 0;
  const totalFollowers = followers.length;
  const totalFollowing = following.length;

  if (route === '/profile' && !session) {
    return <SignIn onDone={(s) => { setSession(s); navigate('/profile'); }} onCancel={() => navigate('/')} />;
  }

  if (route === '/auth/google/callback') {
    return (
      <div className="auth-page">
        <div className="auth-card panel glass">
          <h2>Completing Google sign-in</h2>
          <p className="meta">Hold tight while we finish connecting your Google account.</p>
        </div>
      </div>
    );
  }

  // route handling: simple pathname-based router
  if (route === '/' ) {
    return <Landing onExplore={() => { navigate('/explore'); setActiveView('explore'); }} onProfile={() => { if (session) { navigate('/profile'); setActiveView('profile'); } else { navigate('/signin'); } }} onSignIn={() => navigate('/signin')} onSignUp={() => navigate('/signup')} session={session} />;
  }

  if (route === '/signin') {
    return <SignIn onDone={(s) => { setSession(s); navigate('/profile'); }} onCancel={() => navigate('/')} />;
  }

  if (route === '/signup') {
    return <SignUp onDone={(s) => { setSession(s); navigate('/profile'); }} onCancel={() => navigate('/')} />;
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <aside className="sidebar glass">
        <div>
          <div className="brand-mark">GH</div>
          <div className="sidebar-copy">
            <p className="eyebrow">Grand Gallery</p>
            <h1>Gallery of Wonders</h1>
            <p>Explore the feed, save favorites, follow creators, and publish your own work.</p>
          </div>
        </div>

        <nav className="nav-stack">
          {(
            [
              ['explore', 'Explore'],
              ['studio', 'Studio'],
              ['library', 'Library'],
              ['community', 'Community'],
              ['profile', 'Profile']
            ] as Array<[ViewKey, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`nav-item ${activeView === key ? 'is-active' : ''}`}
              onClick={() => setActiveView(key)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <StatCard label="Creators" value={totalCreators} tone="violet" />
          <StatCard label="Saved Works" value={totalSaved} tone="gold" />
        </div>
      </aside>

      <main className="main-stage">
        <section className="hero glass">
          <div>
            <p className="eyebrow">Creative social platform</p>
            <h2>Build, collect, and follow the best of your gallery.</h2>
            <p className="hero-text">
              A polished frontend for exploring artworks, managing collections, tracking creators, and using your backend as the source of truth.
            </p>
          </div>

          <div className="hero-actions">
            <StatCard label="Works" value={pagination?.totalWorks ?? works.length} tone="aqua" />
            <StatCard label="Interactions" value={dashboard?.stats.totalInteractions ?? 0} tone="rose" />
            <StatCard label="Followers" value={totalFollowers} tone="gold" />
          </div>
        </section>

        <div className="notice-bar glass">{notice}</div>

        {activeView === 'explore' && (
          <section className="content-grid">
            <div className="content-column wide">
              <div className="toolbar glass">
                <input
                  className="field field-search"
                  placeholder="Search artworks, tags, creators..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <select className="field" value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="">All categories</option>
                  <option value="ART">Art</option>
                  <option value="PHOTO">Photography</option>
                  <option value="WRITING">Writing</option>
                  <option value="AUDIO">Audio</option>
                  <option value="VIDEO">Video</option>
                  <option value="OTHER">Other</option>
                </select>
                <select className="field" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortKey)}>
                  <option value="createdAt">Newest</option>
                  <option value="updatedAt">Recently updated</option>
                  <option value="title">Title</option>
                  <option value="price">Price</option>
                </select>
                <select className="field" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as 'desc' | 'asc')}>
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>

              <SectionTitle
                eyebrow="Curated feed"
                title="Artworks"
                subtitle={loading ? 'Loading the latest works...' : 'Browse public artworks straight from your backend.'}
              />

              <div className="art-grid">
                {works.map((work) => (
                  <article key={work.id} className="art-card glass">
                    <button type="button" className="art-preview" onClick={() => openWork(work)}>
                      <img src={work.fileUrl} alt={work.title} />
                    </button>
                    <div className="art-body">
                      <div className="art-topline">
                        <div>
                          <p className="category-label">{work.category}</p>
                          <h3>{work.title}</h3>
                        </div>
                        <div className="art-price">{formatMoney(work.price)}</div>
                      </div>
                      <p className="art-description">{work.description}</p>
                      <div className="tag-row">
                        {getTags(work).slice(0, 4).map((tag) => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                      </div>
                      <div className="meta-row">
                        <div className="meta-author">
                          <Avatar label={work.author?.username ?? 'A'} />
                          <div>
                            <strong>{work.author?.username ?? 'Unknown creator'}</strong>
                            <span>{new Date(work.createdAt ?? Date.now()).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <span className="likes-chip">{work.likesCount ?? work.interactions?.length ?? 0} likes</span>
                      </div>
                      <div className="action-row">
                        <button type="button" className="ghost-btn" onClick={() => void handleLike(work.id)}>
                          Like
                        </button>
                        <button type="button" className="ghost-btn" onClick={() => void handleSaveToggle(work.id)}>
                          {savedWorkIds.has(work.id) ? 'Saved' : 'Save'}
                        </button>
                        <button type="button" className="primary-btn" onClick={() => openWork(work)}>
                          View
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {works.length === 0 && !loading && (
                <div className="empty-state glass">No artworks matched your filters yet.</div>
              )}
            </div>

            <aside className="content-column side">
              <div className="panel glass">
                <SectionTitle
                  eyebrow="Recommendations"
                  title="Your feed"
                  subtitle="Personalized selections from the backend recommendation endpoint."
                />
                <div className="stack">
                  {recommendations.slice(0, 6).map((item) => (
                    <button key={item.work.id} className="mini-card" type="button" onClick={() => openWork(item.work)}>
                      <div>
                        <strong>{item.work.title}</strong>
                        <span>{item.work.category}</span>
                      </div>
                      <Badge>{item.score.toFixed(1)}</Badge>
                    </button>
                  ))}
                  {recommendations.length === 0 && <div className="empty-inline">Sign in to unlock recommendations.</div>}
                </div>
              </div>

              <div className="panel glass">
                <SectionTitle eyebrow="Profile snapshot" title={displayName(profile)} subtitle="Your current account state." />
                {profile ? (
                  <div className="profile-card">
                    <Avatar label={profile.username} />
                    <div>
                      <strong>@{profile.username}</strong>
                      <p>{profile.bio || 'No bio yet.'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="empty-inline">Sign in to sync your profile.</div>
                )}
                <div className="mini-stats">
                  <StatCard label="Collections" value={totalCollections} tone="violet" />
                  <StatCard label="Following" value={totalFollowing} tone="aqua" />
                </div>
              </div>
            </aside>
          </section>
        )}

        {activeView === 'studio' && (
          <section className="content-grid">
            <div className="content-column wide">
              <SectionTitle eyebrow="Creator studio" title="Publish work" subtitle="Use your backend to create a new artwork entry." />
              <form className="panel glass form-grid" onSubmit={handleCreateWork}>
                <input
                  className="field"
                  placeholder="Title"
                  value={workForm.title}
                  onChange={(event) => setWorkForm({ ...workForm, title: event.target.value })}
                />
                <input
                  className="field"
                  placeholder="Image URL"
                  value={workForm.fileUrl}
                  onChange={(event) => setWorkForm({ ...workForm, fileUrl: event.target.value })}
                />
                <select
                  className="field"
                  value={workForm.category}
                  onChange={(event) => setWorkForm({ ...workForm, category: event.target.value })}
                >
                  <option value="ART">Art</option>
                  <option value="PHOTO">Photography</option>
                  <option value="WRITING">Writing</option>
                  <option value="AUDIO">Audio</option>
                  <option value="VIDEO">Video</option>
                  <option value="OTHER">Other</option>
                </select>
                <textarea
                  className="field field-textarea full"
                  placeholder="Description"
                  value={workForm.description}
                  onChange={(event) => setWorkForm({ ...workForm, description: event.target.value })}
                />
                <input
                  className="field full"
                  placeholder="Tags, comma separated"
                  value={workForm.tags}
                  onChange={(event) => setWorkForm({ ...workForm, tags: event.target.value })}
                />
                <button className="primary-btn full" type="submit">
                  Publish artwork
                </button>
              </form>

              <SectionTitle eyebrow="Collections" title="Create collection" subtitle="Group works and keep your gallery organized." />
              <form className="panel glass form-grid" onSubmit={handleCreateCollection}>
                <input
                  className="field"
                  placeholder="Collection title"
                  value={collectionForm.title}
                  onChange={(event) => setCollectionForm({ ...collectionForm, title: event.target.value })}
                />
                <input
                  className="field"
                  placeholder="Description"
                  value={collectionForm.description}
                  onChange={(event) => setCollectionForm({ ...collectionForm, description: event.target.value })}
                />
                <label className="checkbox-row full">
                  <input
                    type="checkbox"
                    checked={collectionForm.isCollaborative}
                    onChange={(event) => setCollectionForm({ ...collectionForm, isCollaborative: event.target.checked })}
                  />
                  Collaborative collection
                </label>
                <button className="primary-btn full" type="submit">
                  Create collection
                </button>
              </form>
            </div>

            <aside className="content-column side">
              <div className="panel glass">
                <SectionTitle eyebrow="Dashboard" title="Your stats" subtitle="Pulled from /api/users/:id/dashboard." />
                <div className="stat-grid">
                  <StatCard label="Works" value={dashboard?.stats.totalWorks ?? 0} tone="aqua" />
                  <StatCard label="Likes" value={dashboard?.stats.totalLikes ?? 0} tone="rose" />
                  <StatCard label="Views" value={dashboard?.stats.totalViews ?? 0} tone="gold" />
                  <StatCard label="Interactions" value={dashboard?.stats.totalInteractions ?? 0} tone="violet" />
                </div>
              </div>

              <div className="panel glass">
                <SectionTitle eyebrow="Recent" title="Your works" subtitle="Latest creations in your dashboard." />
                <div className="stack">
                  {(dashboard?.works ?? []).slice(0, 5).map((work) => (
                    <button key={work.id} className="mini-card" type="button" onClick={() => openWork(work)}>
                      <div>
                        <strong>{work.title}</strong>
                        <span>{work.category}</span>
                      </div>
                      <Badge>{work.likesCount ?? 0} likes</Badge>
                    </button>
                  ))}
                  {(dashboard?.works ?? []).length === 0 && <div className="empty-inline">Your published work will appear here.</div>}
                </div>
              </div>
            </aside>
          </section>
        )}

        {activeView === 'library' && (
          <section className="content-grid">
            <div className="content-column wide">
              <SectionTitle eyebrow="Saved" title="Your library" subtitle="Everything you saved from the gallery." />
              <div className="art-grid compact">
                {(saved?.works ?? []).map((work) => (
                  <article key={work.id} className="art-card glass compact-card">
                    <button type="button" className="art-preview" onClick={() => openWork(work)}>
                      <img src={work.fileUrl} alt={work.title} />
                    </button>
                    <div className="art-body">
                      <h3>{work.title}</h3>
                      <p className="art-description">{work.description}</p>
                      <div className="action-row">
                        <button type="button" className="ghost-btn" onClick={() => void handleSaveToggle(work.id)}>
                          Remove
                        </button>
                        <button type="button" className="primary-btn" onClick={() => openWork(work)}>
                          Open
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {(saved?.works ?? []).length === 0 && <div className="empty-state glass">Save artworks to build a library here.</div>}
            </div>

            <aside className="content-column side">
              <div className="panel glass">
                <SectionTitle eyebrow="Collections" title="Saved collections" subtitle="Collections you collected for later." />
                <div className="stack">
                  {(saved?.collections ?? []).map((collection) => (
                    <div key={collection.id} className="mini-card static-card">
                      <div>
                        <strong>{collection.title}</strong>
                        <span>{collection.description}</span>
                      </div>
                      <Badge>{collection.isCollaborative ? 'Collaborative' : 'Private'}</Badge>
                    </div>
                  ))}
                  {(saved?.collections ?? []).length === 0 && <div className="empty-inline">No saved collections yet.</div>}
                </div>
              </div>
            </aside>
          </section>
        )}

        {activeView === 'community' && (
          <section className="content-grid">
            <div className="content-column wide">
              <SectionTitle eyebrow="Creators" title="Community" subtitle="Discover and follow people using your backend social graph." />
              <div className="user-grid">
                {filteredUsers.map((user) => {
                  const isFollowing = followingIds.has(user.id);
                  return (
                    <article key={user.id} className="user-card glass">
                      <div className="profile-card">
                        <Avatar label={user.username} />
                        <div>
                          <strong>{displayName(user)}</strong>
                          <p>@{user.username}</p>
                        </div>
                      </div>
                      <div className="action-row">
                        <button type="button" className={isFollowing ? 'ghost-btn active' : 'ghost-btn'} onClick={() => void handleFollow(user.id)}>
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                        <button type="button" className="primary-btn" onClick={() => setActiveView('profile')}>
                          Profile
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside className="content-column side">
              <div className="panel glass">
                <SectionTitle eyebrow="Network" title="Followers / following" subtitle="Counts from the social endpoints." />
                <div className="stat-grid">
                  <StatCard label="Followers" value={followers.length} tone="aqua" />
                  <StatCard label="Following" value={following.length} tone="violet" />
                </div>
              </div>
            </aside>
          </section>
        )}

        {activeView === 'profile' && (
          <section className="content-grid">
            <div className="content-column wide">
              <SectionTitle eyebrow="Account" title="Profile" subtitle="Update your profile and manage authentication." />
              {session ? (
                <>
                  <form className="panel glass form-grid" onSubmit={handleProfileUpdate}>
                    <input className="field" placeholder="Username" value={profileForm.username} onChange={(event) => setProfileForm({ ...profileForm, username: event.target.value })} />
                    <input className="field" placeholder="First name" value={profileForm.firstName} onChange={(event) => setProfileForm({ ...profileForm, firstName: event.target.value })} />
                    <input className="field" placeholder="Last name" value={profileForm.lastName} onChange={(event) => setProfileForm({ ...profileForm, lastName: event.target.value })} />
                    <input className="field" placeholder="Website" value={profileForm.website} onChange={(event) => setProfileForm({ ...profileForm, website: event.target.value })} />
                    <input className="field full" placeholder="Avatar URL" value={profileForm.avatarUrl} onChange={(event) => setProfileForm({ ...profileForm, avatarUrl: event.target.value })} />
                    <textarea className="field field-textarea full" placeholder="Bio" value={profileForm.bio} onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })} />
                    <button className="primary-btn full" type="submit">Update profile</button>
                  </form>

                  <div className="profile-summary glass">
                    <div className="profile-card large">
                      <Avatar label={profile?.username ?? session.user.username} />
                      <div>
                        <p className="eyebrow">Signed in</p>
                        <strong>{displayName(profile)}</strong>
                        <span>@{profile?.username ?? session.user.username}</span>
                      </div>
                    </div>
                    <div className="mini-stats">
                      <StatCard label="Access token" value={`${session.token.slice(0, 10)}…`} tone="aqua" />
                      <StatCard label="Refresh token" value={session.refreshToken ? 'Stored' : 'Missing'} tone="gold" />
                    </div>
                    <div className="action-row wrap">
                      <button className="ghost-btn" type="button" onClick={() => void handleRefresh()} disabled={refreshBusy}>
                        {refreshBusy ? 'Refreshing…' : 'Refresh session'}
                      </button>
                      <button className="ghost-btn danger" type="button" onClick={() => void handleLogout()}>
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="panel glass auth-grid">
                  <div className="auth-card">
                    <div className="toggle-row">
                      <button type="button" className={authMode === 'signup' ? 'pill active' : 'pill'} onClick={() => setAuthMode('signup')}>Signup</button>
                      <button type="button" className={authMode === 'login' ? 'pill active' : 'pill'} onClick={() => setAuthMode('login')}>Login</button>
                    </div>

                    {authMode === 'signup' ? (
                      <form className="stack form-stack" onSubmit={handleSignup}>
                        <input className="field" placeholder="Username" value={authForm.username} onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })} />
                        <input className="field" placeholder="Email" type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} />
                        <input className="field" placeholder="Password" type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} />
                        <button className="primary-btn full" type="submit">Create account</button>
                      </form>
                    ) : (
                      <form className="stack form-stack" onSubmit={handleLogin}>
                        <input className="field" placeholder="Email" type="email" value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} />
                        <input className="field" placeholder="Password" type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} />
                        <button className="primary-btn full" type="submit">Sign in</button>
                      </form>
                    )}
                  </div>

                  <div className="auth-card">
                    <form className="stack form-stack" onSubmit={handleGoogleSignIn}>
                      <h3>Google sign-in</h3>
                      <input className="field" placeholder="Paste Google id_token" value={googleToken} onChange={(event) => setGoogleToken(event.target.value)} />
                      <button className="ghost-btn full" type="submit">Sign in with Google</button>
                    </form>

                    <div className="stack form-stack">
                      <h3>Password reset</h3>
                      <input className="field" placeholder="Email" type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} />
                      <div className="action-row wrap">
                        <button className="ghost-btn" type="button" onClick={() => void handleRequestReset()}>Request reset</button>
                      </div>
                      <input className="field" placeholder="Reset token" value={resetToken} onChange={(event) => setResetToken(event.target.value)} />
                      <input className="field" placeholder="New password" type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} />
                      <button className="primary-btn full" type="button" onClick={() => void handleVerifyReset()}>Submit new password</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <aside className="content-column side">
              <div className="panel glass">
                <SectionTitle eyebrow="Status" title="Account details" subtitle="Useful state from the backend session." />
                {session ? (
                  <div className="stack">
                    <div className="mini-card static-card">
                      <div>
                        <strong>{session.user.username}</strong>
                        <span>{session.user.email}</span>
                      </div>
                      <Badge>{session.user.role ?? 'user'}</Badge>
                    </div>
                    <div className="mini-card static-card">
                      <div>
                        <strong>Email</strong>
                        <span>{session.user.isVerified ? 'Verified' : 'Unverified'}</span>
                      </div>
                      <Badge>{session.user.isActive === false ? 'Inactive' : 'Active'}</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="empty-inline">Create an account or sign in to unlock the full experience.</div>
                )}
              </div>
            </aside>
          </section>
        )}
      </main>

      {selectedWork && (
        <div className="modal-backdrop" onClick={() => setSelectedWork(null)}>
          <div className="modal glass" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="close-btn" onClick={() => setSelectedWork(null)}>
              ×
            </button>
            <img src={selectedWork.fileUrl} alt={selectedWork.title} className="modal-image" />
            <div className="modal-body">
              <p className="eyebrow">Artwork detail</p>
              <h3>{selectedWork.title}</h3>
              <p>{selectedWork.description}</p>
              <div className="tag-row">
                {getTags(selectedWork).map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <div className="action-row wrap">
                <button type="button" className="ghost-btn" onClick={() => void handleLike(selectedWork.id)}>
                  Like
                </button>
                <button type="button" className="ghost-btn" onClick={() => void handleSaveToggle(selectedWork.id)}>
                  {savedWorkIds.has(selectedWork.id) ? 'Remove save' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
