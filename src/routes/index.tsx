import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';

// 导入App组件
import App from '../App';

// 错误边界组件
const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error);
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error">发生错误: {error?.message || '未知错误'}</Alert>
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: '16px', padding: '8px 16px', cursor: 'pointer' }}
        >
          刷新页面
        </button>
      </Box>
    );
  }

  return <>{children}</>;
};

// 加载状态组件
const LoadingSpinner: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        width: '100%',
      }}
    >
      <CircularProgress />
    </Box>
  );
};

// 受保护路由组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const isAuthenticated = !!localStorage.getItem('token');

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// 懒加载包装组件
const LazyLoad: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<LoadingSpinner />}>
    <ErrorBoundary>{children}</ErrorBoundary>
  </Suspense>
);

// 懒加载页面组件
const Home = lazy(() => import('../pages/Home'));
const About = lazy(() => import('../pages/About'));
const Contact = lazy(() => import('../pages/Contact'));
const Login = lazy(() => import('../pages/Login'));
const Cards = lazy(() => import('../pages/Cards'));
const CreateCard = lazy(() => import('../pages/CreateCard'));
const MyCards = lazy(() => import('../pages/MyCards'));
const Meetups = lazy(() => import('../pages/Meetups'));
const WeeklyCards = lazy(() => import('../pages/WeeklyCards'));
const CardDetail = lazy(() => import('../pages/CardDetail'));
const CardEdit = lazy(() => import('../pages/CardEdit'));
const MeetupDetail = lazy(() => import('../pages/MeetupDetail'));
const CreateMeetup = lazy(() => import('../pages/CreateMeetup'));
const CoverEditor = lazy(() => import('../pages/CoverEditor'));
const CoverEditorMobile = lazy(() => import('../pages/CoverEditorMobile'));
const NotFound = lazy(() => import('../pages/NotFound'));
const ChangePassWord = lazy(() => import('../pages/ChangePassWord'));
const ActSignup = lazy(() => import('../pages/ActSignup'));

// 创建路由器
const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      errorElement: (
        <ErrorBoundary>
          <LoadingSpinner />
        </ErrorBoundary>
      ),
      children: [
        {
          index: true,
          element: (
            <LazyLoad>
              <Home />
            </LazyLoad>
          ),
        },
        {
          path: 'about',
          element: (
            <LazyLoad>
              <About />
            </LazyLoad>
          ),
        },
        {
          path: 'contact',
          element: (
            <LazyLoad>
              <Contact />
            </LazyLoad>
          ),
        },
        {
          path: 'login',
          element: (
            <LazyLoad>
              <Login />
            </LazyLoad>
          ),
        },
        {
          path: 'cards',
          element: (
            <LazyLoad>
              <Cards />
            </LazyLoad>
          ),
        },
        {
          path: 'create-card',
          element: (
            <ProtectedRoute>
              <LazyLoad>
                <CreateCard />
              </LazyLoad>
            </ProtectedRoute>
          ),
        },
        {
          path: 'my-cards',
          element: (
            <ProtectedRoute>
              <LazyLoad>
                <MyCards />
              </LazyLoad>
            </ProtectedRoute>
          ),
        },
        {
          path: 'meetups',
          element: (
            <LazyLoad>
              <Meetups />
            </LazyLoad>
          ),
        },
        {
          path: 'weekly-cards',
          element: (
            <LazyLoad>
              <WeeklyCards />
            </LazyLoad>
          ),
        },
        {
          path: 'card-detail/:id',
          element: (
            <LazyLoad>
              <CardDetail />
            </LazyLoad>
          ),
        },
        {
          path: 'card-edit/:id',
          element: (
            <ProtectedRoute>
              <LazyLoad>
                <CardEdit />
              </LazyLoad>
            </ProtectedRoute>
          ),
        },
        {
          path: 'meetup-detail/:id',
          element: (
            <LazyLoad>
              <MeetupDetail />
            </LazyLoad>
          ),
        },
        {
          path: 'create-meetup',
          element: (
            <ProtectedRoute>
              <LazyLoad>
                <CreateMeetup />
              </LazyLoad>
            </ProtectedRoute>
          ),
        },
        {
          path: 'my-meetups',
          element: (
            <ProtectedRoute>
              <LazyLoad>
                <Meetups />
              </LazyLoad>
            </ProtectedRoute>
          ),
        },
        {
          path: 'cover-editor',
          element: (
            <LazyLoad>
              <CoverEditor />
            </LazyLoad>
          ),
        },
        {
          path: 'cover-editor-mobile',
          element: (
            <LazyLoad>
              <CoverEditorMobile />
            </LazyLoad>
          ),
        },
        {
          path: 'change-password',
          element: (
            <ProtectedRoute>
              <LazyLoad>
                <ChangePassWord />
              </LazyLoad>
            </ProtectedRoute>
          ),
        },
        {
          path: 'act-signup',
          element: (
            <LazyLoad>
              <ActSignup />
            </LazyLoad>
          ),
        },
        {
          path: '404',
          element: (
            <LazyLoad>
              <NotFound />
            </LazyLoad>
          ),
        },
        {
          path: '*',
          element: <Navigate to="/404" replace />,
        },
      ],
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

export default router;
