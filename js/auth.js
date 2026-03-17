// ============================================================
// Auth System — localStorage mock authentication
// ============================================================

const NS = 'moviesdb_';

const getUsers = () => {
  try { return JSON.parse(localStorage.getItem(NS + 'users')) || {}; }
  catch { return {}; }
};

const saveUsers = (users) => localStorage.setItem(NS + 'users', JSON.stringify(users));

export const getCurrentUser = () => {
  const email = localStorage.getItem(NS + 'currentUser');
  if (!email) return null;
  const users = getUsers();
  return users[email] || null;
};

export const register = (name, email, password) => {
  const users = getUsers();
  if (users[email]) {
    throw new Error('An account with this email already exists.');
  }
  users[email] = { name, email, password };
  saveUsers(users);
  localStorage.setItem(NS + 'currentUser', email);
  return users[email];
};

export const login = (email, password) => {
  const users = getUsers();
  const user = users[email];
  if (!user || user.password !== password) {
    throw new Error('Invalid email or password.');
  }
  localStorage.setItem(NS + 'currentUser', email);
  return user;
};

export const logout = () => {
  localStorage.removeItem(NS + 'currentUser');
};

export const deleteAccount = () => {
  const email = localStorage.getItem(NS + 'currentUser');
  if (email) {
    const users = getUsers();
    delete users[email];
    saveUsers(users);
    localStorage.removeItem(NS + 'currentUser');
    
    // Clean up user data
    localStorage.removeItem(`${NS}${email}_watched`);
    localStorage.removeItem(`${NS}${email}_watchlist`);
  }
};
