import styled from "styled-components";

const StyledNavigation = styled.div`
  height: 50px;
  flex: 1;
  background: linear-gradient(180deg, #4b4d61, #34364a);
  color: #fff;
`;

function Navigation() {
  return <StyledNavigation>Navigation</StyledNavigation>;
}

export default Navigation;
