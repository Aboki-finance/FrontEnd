import React from "react";
import { FaTwitter, FaGithub, FaTelegram, FaDiscord } from "react-icons/fa";

const Footer: React.FC = () => {
   return (
      <footer className="bg-white text-gray-700 py-8 mt-auto shadow-sm">
         <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-center items-center">
               {/* Social Links */}
               <div className="flex gap-4">
                  <a
                     href="#"
                     className="text-gray-600 hover:text-purple-500 transition-colors">
                     <FaTwitter size={20} />
                  </a>
                  <a
                     href="#"
                     className="text-gray-600 hover:text-purple-500 transition-colors">
                     <FaGithub size={20} />
                  </a>
                  <a
                     href="#"
                     className="text-gray-600 hover:text-purple-500 transition-colors">
                     <FaTelegram size={20} />
                  </a>
                  <a
                     href="#"
                     className="text-gray-600 hover:text-purple-500 transition-colors">
                     <FaDiscord size={20} />
                  </a>
               </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-600">
               <p>
                  &copy; {new Date().getFullYear()} Aboki. All rights reserved.
               </p>
            </div>
         </div>
      </footer>
   );
};

export default Footer;
