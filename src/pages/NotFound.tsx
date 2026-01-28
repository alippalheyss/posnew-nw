import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from 'react-i18next';

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  const renderBoth = (key: string, options?: any) => (
    <>
      {t(key, options)} ({t(key, { ...options, lng: 'en' })})
    </>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">404</h1> {/* Reduced from text-4xl */}
        <p className="text-lg text-gray-600 mb-4 break-words">{renderBoth('not_found_message')}</p> {/* Reduced from text-xl and added break-words */}
        <a href="/" className="text-blue-500 hover:text-blue-700 underline break-words"> {/* Added break-words */}
          {renderBoth('return_to_home')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;