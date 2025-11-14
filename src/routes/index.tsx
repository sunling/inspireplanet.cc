import React, { Suspense, lazy, useState, useEffect } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// 导入主组件和工具组件
import App from '../App';
import Error from '../components/ErrorCard/index';
import Loading from '../components/Loading/index';
import MyMeetups from '@/pages/personal/MyMeetups';

// 错误边界组件
const ErrorBoundary: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error);
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Error
          message={error?.message || '未知错误'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return <>{children}</>;
};

// 受保护路由组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const isAuthenticated = !!localStorage.getItem('authToken');
  console.log('isAuthenticated', isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// 路由辅助函数
const createLazyRoute = (Component: React.ReactNode) => (
  <Suspense fallback={<Loading />}>
    <ErrorBoundary>{Component}</ErrorBoundary>
  </Suspense>
);

const createProtectedRoute = (Component: React.ReactNode) => (
  <ProtectedRoute>{createLazyRoute(Component)}</ProtectedRoute>
);

// 懒加载页面组件
const Home = lazy(() => import('../pages/home/Home'));
const About = lazy(() => import('../pages/introduce/About'));
const Contact = lazy(() => import('../pages/introduce/Contact'));
const Login = lazy(() => import('../pages/auth/Login'));
const Cards = lazy(() => import('../pages/card/Cards'));
const CreateCard = lazy(() => import('../pages/card/CardCreate'));
const MyCards = lazy(() => import('../pages/personal/MyCards'));
const Meetups = lazy(() => import('../pages/activity/Meetups'));
const WeeklyCards = lazy(() => import('../pages/card/WeeklyCards'));
const CardDetail = lazy(() => import('../pages/card/CardDetail'));
const CardEdit = lazy(() => import('../pages/card/CardEdit'));
const MeetupDetail = lazy(() => import('../pages/activity/MeetupDetail'));
const CreateMeetup = lazy(() => import('../pages/activity/CreateMeetup'));
const CoverEditor = lazy(() => import('../pages/tools/CoverEditor'));
const CoverEditorMobile = lazy(
  () => import('../pages/tools/CoverEditorMobile')
);
const NotFound = lazy(() => import('../components/NotFound/index'));
const ChangePassWord = lazy(() => import('../pages/auth/ChangePassWord'));
const ActSignup = lazy(() => import('../pages/auth/ActSignup'));

// 创建路由器
const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      errorElement: <ErrorBoundary />,
      children: [
        // 公开路由
        { index: true, element: createLazyRoute(<Home />) },
        { path: 'about', element: createLazyRoute(<About />) },
        { path: 'home', element: createLazyRoute(<Home />) },
        { path: 'contact', element: createLazyRoute(<Contact />) },
        { path: 'login', element: createLazyRoute(<Login />) },
        { path: 'cards', element: createLazyRoute(<Cards />) },
        { path: 'meetups', element: createLazyRoute(<Meetups />) },
        { path: 'weekly-cards', element: createLazyRoute(<WeeklyCards />) },
        { path: 'card-detail/:id', element: createLazyRoute(<CardDetail />) },
        {
          path: 'meetup-detail/:id',
          element: createLazyRoute(<MeetupDetail />),
        },
        { path: 'cover-editor', element: createLazyRoute(<CoverEditor />) },
        {
          path: 'cover-editor-mobile',
          element: createLazyRoute(<CoverEditorMobile />),
        },
        { path: 'act-signup', element: createLazyRoute(<ActSignup />) },
        { path: '404', element: createLazyRoute(<NotFound />) },

        // 受保护路由
        { path: 'create-card', element: createProtectedRoute(<CreateCard />) },
        { path: 'my-cards', element: createProtectedRoute(<MyCards />) },
        { path: 'card-edit/:id', element: createProtectedRoute(<CardEdit />) },
        {
          path: 'create-meetup',
          element: createProtectedRoute(<CreateMeetup />),
        },
        { path: 'my-meetups', element: createProtectedRoute(<MyMeetups />) },
        {
          path: 'change-password',
          element: createProtectedRoute(<ChangePassWord />),
        },

        // 404路由
        { path: '*', element: <Navigate to="/404" replace /> },
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
