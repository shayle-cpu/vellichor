// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Bookshelf from "./pages/Bookshelf";
import AddBook from "./pages/AddBook";
import Spinner from "./components/Spinner";
import SeriesTracker from "./pages/SeriesTracker";
import StatsPage from "./pages/StatsPage";
import Calendar from "./pages/Calendar";
import ChallengesPage from "./pages/ChallengesPage";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import { BookProvider } from "./context/BookContext";
import { ReadingLogProvider } from "./context/ReadingLogContext";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { AchievementsProvider } from "./context/AchievementsContext";

// ⬇️ NEW: Predictions page
import PredictionsPage from "./pages/PredictionsPage";

// Social pages
import PeopleSearch from "./pages/PeopleSearch";
import Friends from "./pages/Friends";
import PublicProfile from "./pages/PublicProfile";
import PublicLibrary from "./pages/PublicLibrary";

// Community
import Community from "./pages/Community";

import "./styles/App.css";

function App() {
  return (
    <AuthProvider>
      <BookProvider>
        <ReadingLogProvider>
          <AchievementsProvider>
            <BrowserRouter>
              <div className="App">
                <Navbar />

                <Routes>
                  {/* Public routes */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* Everything else requires login */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Home />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/library"
                    element={
                      <ProtectedRoute>
                        <Bookshelf />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/add-book"
                    element={
                      <ProtectedRoute>
                        <AddBook />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/tbr-prompt"
                    element={
                      <ProtectedRoute>
                        <Spinner />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/series"
                    element={
                      <ProtectedRoute>
                        <SeriesTracker />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/calendar"
                    element={
                      <ProtectedRoute>
                        <Calendar />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/stats"
                    element={
                      <ProtectedRoute>
                        <StatsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/challenges"
                    element={
                      <ProtectedRoute>
                        <ChallengesPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* NEW: Predictions (authed) */}
                  <Route
                    path="/predictions"
                    element={
                      <ProtectedRoute>
                        <PredictionsPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Social/search (authed) */}
                  <Route
                    path="/people"
                    element={
                      <ProtectedRoute>
                        <PeopleSearch />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/friends"
                    element={
                      <ProtectedRoute>
                        <Friends />
                      </ProtectedRoute>
                    }
                  />

                  {/* Community (authed) */}
                  <Route
                    path="/community"
                    element={
                      <ProtectedRoute>
                        <Community />
                      </ProtectedRoute>
                    }
                  />

                  {/* Public profile/library */}
                  <Route path="/u/:username" element={<PublicProfile />} />
                  <Route path="/u/:username/library" element={<PublicLibrary />} />
                </Routes>
              </div>
            </BrowserRouter>
          </AchievementsProvider>
        </ReadingLogProvider>
      </BookProvider>
    </AuthProvider>
  );
}

export default App;
