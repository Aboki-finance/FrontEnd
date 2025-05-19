import logo from "../assets/aboki.svg";

const Logo = () => {
   return (
      <img
         src={logo}
         alt="Aboki Logo"
         className=" object-cover rounded-lg w-27 h-9 mr-4"
      />
   );
};

export default Logo;
