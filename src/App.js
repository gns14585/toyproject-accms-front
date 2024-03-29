import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
  VStack,
} from "@chakra-ui/react";
import axios from "axios";
import { useDaumPostcodePopup } from "react-daum-postcode";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleLeft, faAngleRight } from "@fortawesome/free-solid-svg-icons";

// ----------------------- 페이징 로직 -----------------------
function PageButton({ variant, pageNumber, children }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  function handleClick() {
    params.set("p", pageNumber);
    navigate("/?" + params);
  }

  return (
    <Button variant={variant} onClick={handleClick}>
      {children}
    </Button>
  );
}
function Pagination({ pageInfo }) {
  const navigate = useNavigate();
  const pageNumbers = [];

  for (let i = pageInfo.startPageNumber; i <= pageInfo.endPageNumber; i++) {
    pageNumbers.push(i);
  }

  return (
    <Box>
      {pageInfo.prevPageNumber && (
        <Button
          variant="ghost"
          onClick={() => navigate("/?p=" + pageInfo.prevPageNumber)}
        >
          <FontAwesomeIcon icon={faAngleLeft} />
        </Button>
      )}

      {pageNumbers.map((pageNumber) => (
        <PageButton
          key={pageNumber}
          variant={
            pageNumber === pageInfo.currentPageNumber ? "solid" : "ghost"
          }
          pageNumber={pageNumber}
        >
          {pageNumber}
        </PageButton>
      ))}

      {pageInfo.nextPageNumber && (
        <Button
          variant="ghost"
          onClick={() => navigate("/?p=" + pageInfo.nextPageNumber)}
        >
          <FontAwesomeIcon icon={faAngleRight} />
        </Button>
      )}
    </Box>
  );
}

// ----------------------- 검색 로직 -----------------------
function SearchComponent() {
  const [businessNumber, setBusinessNumber] = useState("");
  const [companyName, setCompanyName] = useState("");

  const navigate = useNavigate();

  function handleSearch() {
    const params = new URLSearchParams();
    if (businessNumber) {
      params.set("b", businessNumber);
    }
    if (companyName) {
      params.set("c", companyName);
    }
    navigate("/?" + params.toString());
  }

  // ------------ Input에서 엔터키 눌렀을때 조회버튼 클릭되는 로직 ------------
  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <>
      <Box p={3}>
        <HStack mt={5}>
          <Text w={"150px"}>사업자 번호</Text>
          <Input
            borderWidth={"2px"}
            borderRadius={0}
            onKeyDown={handleKeyDown}
            value={businessNumber}
            onChange={(e) => setBusinessNumber(e.target.value)}
          />
        </HStack>
        <HStack mt={10} mb={5}>
          <Text w={"150px"}>거래처명</Text>
          <Input
            borderWidth={"2px"}
            borderRadius={0}
            onKeyDown={handleKeyDown}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </HStack>
      </Box>
      <Box
        alignItems={"flex-end"}
        display={"flex"}
        justifyContent={"center"}
        mb={8}
        ml={5}
        mr={3}
      >
        <Button borderWidth={"2px"} borderRadius={0} onClick={handleSearch}>
          조회
        </Button>
      </Box>
    </>
  );
}

function App(props) {
  // ----------------------- 거래처 정보 상태 -----------------------
  const [companyNumber, setCompanyNumber] = useState(""); // 사업자번호
  const [abbreviated, setAbbreviated] = useState(""); // 약칭
  const [companyName, setCompanyName] = useState(""); // 거래처명
  const [representative, setRepresentative] = useState(""); // 대표자명
  const [responsiblefor, setResponsiblefor] = useState(""); // 담당자명
  const [businessType, setBusinessType] = useState(""); // 업태
  const [items, setItems] = useState(""); // 종목
  const [postalCode, setPostalCode] = useState(""); // 우편번호
  const [primaryAddress, setPrimaryAddress] = useState(""); // 기본주소
  const [detailedAddress, setDetailedAddress] = useState(""); // 상세주소
  const [phoneNumber, setPhoneNumber] = useState(""); // 전화번호
  const [faxNumber, setFaxNumber] = useState(""); // 팩스번호
  const [homepageurl, setHomepageurl] = useState(""); // 홈페이지
  const [companyType, setCompanyType] = useState("법인"); // 법인여부
  const [countryType, setCountryType] = useState("국내"); // 해외여부
  const [contractPeriod1, setContractPeriod1] = useState(""); // 계약기간1
  const [contractPeriod2, setContractPeriod2] = useState(""); // 계약기간2
  const [registrationInformation, setRegistrationInformation] = useState(""); // 등록정보
  const [registrationDateTime, setRegistrationDateTime] = useState(""); // 등록날짜
  const [changeInformation, setChangeInformation] = useState(""); // 변경정보
  const [changeDateTime, setChangeDateTime] = useState(""); // 변경날짜

  const [offices, setOffices] = useState(""); // 사무소
  const [bankingInformation, setBankingInformation] = useState(""); // 은행정보
  const [accountNumber, setAccountNumber] = useState(""); // 계좌번호

  const [customersList, setCustomersList] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const navigate = useNavigate();

  const [params] = useSearchParams();
  const location = useLocation();
  const [pageInfo, setPageInfo] = useState(null);

  const toast = useToast();
  const { isOpen, onClose, onOpen } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();

  // Daum Postcode 스크립트 URL
  const scriptUrl =
    "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

  // Daum Postcode 팝업을 여는 함수
  const openPostcodePopup = useDaumPostcodePopup(scriptUrl);

  // 주소 검색 완료 핸들러
  const handleComplete = (data) => {
    let fullAddress = data.roadAddress; // 도로명 주소
    let extraAddress = "";
    // 도로명 주소에 부가 정보가 있다면 추가
    if (data.addressType === "R") {
      if (data.bname !== "") {
        extraAddress += data.bname;
      }
      if (data.buildingName !== "") {
        extraAddress += extraAddress
          ? `, ${data.buildingName}`
          : data.buildingName;
      }
      fullAddress += extraAddress ? ` (${extraAddress})` : "";
    }
    // 우편번호 설정
    setPostalCode(data.zonecode);
    // 사용자가 도로명 주소를 선택했는지, 지번 주소를 선택했는지에 따라 기본 주소 상태를 설정
    if (data.userSelectedType === "R") {
      // 사용자가 도로명 주소를 선택한 경우
      setPrimaryAddress(fullAddress);
    } else {
      // 사용자가 지번 주소를 선택한 경우
      setPrimaryAddress(data.jibunAddress);
    }
    // 상세 주소는 사용자가 직접 입력하도록 비워둡니다.
    setDetailedAddress("");
  };

  // ------------------------------ 주소검색 버튼 클릭시 다음 postcode 팝업 열리게 하는 로직 ------------------------------
  const handlePostCodeClick = () => {
    openPostcodePopup({ onComplete: handleComplete });
  };

  // ------------------------------ 거래처 리스트 가져오기 ------------------------------
  useEffect(() => {
    const queryString = params.toString();
    axios.get("/api/account/list?" + queryString).then((response) => {
      setCustomersList(response.data.accountList);
      setPageInfo(response.data.pageInfo);
    });
  }, [location]);

  if (customersList === null) {
    return <Spinner />;
  }

  // ------------------------------ 등록버튼 클릭시 서버로 전송 로직 ------------------------------
  function handleSubmit() {
    const newCustomer = {
      companyNumber: companyNumber,
      abbreviated: abbreviated,
      companyName: companyName,
      representative: representative,
      responsiblefor: responsiblefor,
      businessType: businessType,
      items: items,
      postalCode: postalCode,
      primaryAddress: primaryAddress,
      detailedAddress: detailedAddress,
      phoneNumber: phoneNumber,
      faxNumber: faxNumber,
      homepageurl: homepageurl,
      companyType: companyType,
      countryType: countryType,
      contractPeriod1: contractPeriod1,
      contractPeriod2: contractPeriod2,
      registrationInformation: registrationInformation,
      registrationDateTime: registrationDateTime,
      changeInformation: changeInformation,
      changeDateTime: changeDateTime,
      offices: offices,
      bankingInformation: bankingInformation,
      accountNumber: accountNumber,
    };
    axios
      .post("/api/account/add", newCustomer)
      .then(() => {
        // 실시간으로 리스트 업데이트
        // 요청 성공 시, 새 거래처를 리스트의 맨 위에 추가
        setCustomersList((prevList) => [newCustomer, ...prevList]);
        toast({
          description: "거래처 등록 되었습니다.",
          status: "success",
        });
      })
      .catch(() => {
        toast({
          description: "거래처 등록 중 오류 발생하였습니다.",
          status: "error",
        });
      });
  }

  // ------------------------------ 초기화 버튼 클릭시 실행되는 로직 ------------------------------
  function handleReset() {
    setCompanyNumber("");
    setAbbreviated("");
    setCompanyName("");
    setRepresentative("");
    setResponsiblefor("");
    setBusinessType("");
    setItems("");
    setPostalCode("");
    setPrimaryAddress("");
    setDetailedAddress("");
    setPhoneNumber("");
    setFaxNumber("");
    setHomepageurl("");
    setCompanyType("법인");
    setCountryType("국내");
    setContractPeriod1("");
    setContractPeriod2("");
    setRegistrationInformation("");
    setRegistrationDateTime("");
    setChangeInformation("");
    setChangeDateTime("");
    setOffices("");
    setBankingInformation("");
    setAccountNumber("");
  }

  // ------------------------------ 삭제버튼 클릭시 실행되는 로직 ------------------------------
  function handleDelete() {
    // 등록과 동일하게 삭제 시 리스트에서 실시간으로 삭제처리됨
    // 현재 컴포넌트 상태에 있는 companyNumber를 저장
    const companyNumberToDelete = companyNumber;

    axios
      .delete("/api/account/delete", {
        // data를 넣는 이유
        // 1. axios.delete 메서드는 보통 url의 정보를 사용함 ex) "/api/account/delete" + account_id (게시글삭제)
        // 2. 또는 로그인 한 아이디 session의 정보 (회원탈퇴)
        // 3. 근데 url의 정보가 없는경우 본문을 통해 전달해야함.
        // 4. data를 사용하면 요청본문을 서버로 보냄.
        data: {
          companyNumber: companyNumberToDelete, // PK
        },
      })
      .then(() => {
        setCustomersList((list) =>
          list.filter(
            (customer) => customer.companyNumber !== companyNumberToDelete,
          ),
        );
        toast({
          description: "거래처 정보가 삭제되었습니다.",
          status: "success",
        });
        onClose();
      })
      .catch(() => {
        toast({
          description: "삭제 중 오류가 발생하였습니다.",
          status: "error",
        });
      });
  }

  // ------------------------------ 수정버튼 클릭시 실행되는 로직 ------------------------------
  function handleEditSubmit() {
    axios
      .put("/api/account/edit", {
        companyNumber: companyNumber,
        abbreviated: abbreviated,
        companyName: companyName,
        representative: representative,
        responsiblefor: responsiblefor,
        businessType: businessType,
        items: items,
        postalCode: postalCode,
        primaryAddress: primaryAddress,
        detailedAddress: detailedAddress,
        phoneNumber: phoneNumber,
        faxNumber: faxNumber,
        homepageurl: homepageurl,
        companyType: companyType,
        countryType: countryType,
        contractPeriod1: contractPeriod1,
        contractPeriod2: contractPeriod2,
        registrationInformation: registrationInformation,
        registrationDateTime: registrationDateTime,
        changeInformation: changeInformation,
        changeDateTime: changeDateTime,
        offices: offices,
        bankingInformation: bankingInformation,
        accountNumber: accountNumber,
      })
      .then(() => {
        onEditClose();
        toast({
          description: "수정되었습니다.",
          status: "success",
        });
        // 수정버튼 클릭했을때 거래처 리스트에 실시간으로 변경내역 저장 (새로고침 안해도 변경내역 바로 볼 수 있음)
        setCustomersList((prevList) =>
          prevList.map((customer) => {
            if (customer.companyNumber === companyNumber) {
              return {
                ...customer,
                abbreviated,
                companyName,
                representative,
                responsiblefor,
                businessType,
                items,
                postalCode,
                primaryAddress,
                detailedAddress,
                phoneNumber,
                faxNumber,
                homepageurl,
                companyType,
                countryType,
                contractPeriod1,
                contractPeriod2,
                registrationInformation,
                registrationDateTime,
                changeInformation,
                changeDateTime,
                offices,
                bankingInformation,
                accountNumber,
              };
            }
            return customer;
          }),
        );
      })
      .catch(() => {
        toast({
          description: "수정 중 오류가 발생하였습니다.",
          status: "error",
        });
      });
  }

  // ------------------------------ 글자수가 특정개수 이상일때 자르기 ------------------------------
  const truncateText = (str, num) => {
    if (str && str.length > num) {
      return str.slice(0, num) + "...";
    }
    return str;
  };

  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer);
    // 거래처를 클릭하면 해당 거래처의 정보를 입력 필드에 표시
    setCompanyNumber(customer.companyNumber || "");
    setAbbreviated(customer.abbreviated || "");
    setCompanyName(customer.companyName || "");
    setRepresentative(customer.representative || "");
    setResponsiblefor(customer.responsiblefor || "");
    setBusinessType(customer.businessType || "");
    setItems(customer.items || "");
    setPostalCode(customer.postalCode || "");
    setPrimaryAddress(customer.primaryAddress || "");
    setDetailedAddress(customer.detailedAddress || "");
    setPhoneNumber(customer.phoneNumber || "");
    setFaxNumber(customer.faxNumber || "");
    setHomepageurl(customer.homepageurl || "");
    setCompanyType(customer.companyType || "법인");
    setCountryType(customer.countryType || "국내");
    setContractPeriod1(customer.contractPeriod1 || "");
    setContractPeriod2(customer.contractPeriod2 || "");
    setRegistrationInformation(customer.registrationInformation || "");
    setRegistrationDateTime(customer.registrationDateTime || "");
    setChangeInformation(customer.changeInformation || "");
    setChangeDateTime(customer.changeDateTime || "");
    setOffices(customer.offices || "");
    setBankingInformation(customer.bankingInformation || "");
    setAccountNumber(customer.accountNumber || "");
  };

  return (
    <Box justifyContent="center" minW={"1200px"} p={10}>
      <Box>
        <Text
          bg={"#eeeeee"}
          h={"50px"}
          alignItems={"center"}
          justifyContent={"center"}
          display={"flex"}
          textAlign={"center"}
          fontWeight={"bold"}
        >
          거래처 관리 시스템
        </Text>
      </Box>

      <Box
        mt={5}
        display={"flex"}
        justifyContent={"center"}
        alignItems={"center"}
      >
        <Flex gap={4} w={"1375px"} justifyContent={"flex-end"}>
          <Button onClick={handleReset}>초기화</Button>
          <Button onClick={handleSubmit}>등록</Button>
          <Button onClick={onEditOpen}>수정</Button>
          <Button onClick={onOpen}>삭제</Button>
        </Flex>
      </Box>

      {/* ------------------------ 거래처 검색 하는곳 ------------------------@@*/}
      <Flex justifyContent={"center"} mt={5} alignItems={"start"}>
        <Box borderWidth={"2px"} maxW={"404px"}>
          <SearchComponent />

          <Box
            _hover={{ cursor: "pointer" }}
            align="stretch"
            borderWidth={"1px"}
            w={"400px"}
            textAlign={"center"}
          >
            {/* 헤더 부분 */}
            <Flex>
              <Box
                borderRightWidth={"1px"}
                borderBottomWidth={"1px"}
                p={3}
                w={"200px"}
              >
                <Text fontWeight={"bold"}>사업자 번호</Text>
              </Box>
              <Box borderBottomWidth={"1px"} p={3} w={"200px"}>
                <Text fontWeight={"bold"}>거래처명</Text>
              </Box>
            </Flex>
            {customersList.map(
              (customer) =>
                customer && (
                  <Flex
                    h={"49px"}
                    key={customer.companyNumber}
                    onClick={() => handleCustomerClick(customer)}
                  >
                    <Box
                      p={3}
                      w={"200px"}
                      borderBottomWidth={"1px"}
                      borderRightWidth={"1px"}
                    >
                      <Text>{customer.companyNumber}</Text>
                    </Box>
                    <Box p={3} w={"200px"} borderBottomWidth={"1px"}>
                      <Text>{truncateText(customer.companyName, 10)}</Text>
                    </Box>
                  </Flex>
                ),
            )}
            {/* 필요한 수만큼 빈 행을 추가 */}
            {[...Array(10 - customersList.length)].map((_, index) => (
              <Flex h={"49px"} key={index}>
                <Box
                  p={3}
                  w={"200px"}
                  borderBottomWidth={"1px"}
                  borderRightWidth={"1px"}
                >
                  <Text>&nbsp;</Text>
                </Box>
                <Box p={3} w={"200px"} borderBottomWidth={"1px"}>
                  <Text>&nbsp;</Text>
                </Box>
              </Flex>
            ))}
          </Box>
        </Box>

        {/* ------------------------ 거래처 CRUD 하는곳 ------------------------ */}
        <Box p={2} ml={5} w={"950px"} h={"800px"} borderWidth={"2px"}>
          <FormControl mt={4}>
            <HStack>
              <FormLabel w={"80px"}>
                <Flex mt={2} justifyContent={"space-between"}>
                  <Text>사</Text> <Text>업</Text> <Text>자</Text>{" "}
                  <Text>번</Text> <Text>호</Text>
                </Flex>
              </FormLabel>
              <Input
                value={companyNumber}
                onChange={(e) => setCompanyNumber(e.target.value)}
                w={"230px"}
                mr={28}
              />

              <FormLabel w={"80px"}>
                <Flex mt={2} justifyContent="space-between">
                  <Text>약</Text> <Text>칭</Text>
                </Flex>
              </FormLabel>
              <Input
                // value={abbreviated}
                value={abbreviated}
                onChange={(e) => setAbbreviated(e.target.value)}
                w={"250px"}
              />
            </HStack>
          </FormControl>

          <FormControl mt={4}>
            <HStack>
              <FormLabel w={"80px"}>
                <Flex mt={2} justifyContent="space-between">
                  <Text>거</Text> <Text>래</Text> <Text>처</Text>
                  <Text>명</Text>
                </Flex>
              </FormLabel>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                w={"450px"}
              />
            </HStack>
          </FormControl>

          <FormControl mt={4}>
            <HStack>
              <FormLabel w={"80px"}>
                <Flex mt={2} justifyContent="space-between">
                  <Text>대</Text> <Text>표</Text> <Text>자</Text>
                </Flex>
              </FormLabel>
              <Input
                value={representative}
                onChange={(e) => setRepresentative(e.target.value)}
                w={"230px"}
                mr={28}
              />

              <FormLabel w={"80px"}>
                <Flex mt={2} justifyContent="space-between">
                  <Text>담</Text> <Text>당</Text> <Text>자</Text>
                </Flex>
              </FormLabel>
              <Input
                value={responsiblefor}
                onChange={(e) => setResponsiblefor(e.target.value)}
                w={"250px"}
              />
            </HStack>
          </FormControl>

          <FormControl mt={4}>
            <HStack>
              <FormLabel w={"80px"}>
                <Flex mt={2} justifyContent={"space-between"}>
                  <Text>업</Text> <Text>태</Text>
                </Flex>
              </FormLabel>
              <Input
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                w={"230px"}
                mr={28}
              />

              <FormLabel w={"80px"}>
                <Flex mt={2} justifyContent="space-between">
                  <Text>종</Text> <Text>목</Text>
                </Flex>
              </FormLabel>
              <Input
                value={items}
                onChange={(e) => setItems(e.target.value)}
                w={"250px"}
              />
            </HStack>
          </FormControl>

          <FormControl mt={4}>
            <HStack>
              <FormLabel w={"80px"}>
                <Flex mt={2} justifyContent={"space-between"}>
                  <Text>우</Text> <Text>편</Text> <Text>번</Text>{" "}
                  <Text>호</Text>
                </Flex>
              </FormLabel>
              <Input
                readOnly
                onChange={(e) => setPostalCode(e.target.value)}
                value={postalCode}
                w={"230px"}
              />
              <Button mr={10} onClick={handlePostCodeClick}>
                검색
              </Button>

              <FormLabel w={"80px"}>
                <Flex mt={2} justifyContent="space-between">
                  <Text>기</Text> <Text>본</Text> <Text>주</Text>{" "}
                  <Text>소</Text>
                </Flex>
              </FormLabel>
              <Input
                value={primaryAddress}
                onChange={(e) => setPrimaryAddress(e.target.value)}
                w={"350px"}
              />
            </HStack>
          </FormControl>

          <FormControl mt={4}>
            <HStack>
              <FormLabel w={"80px"}>
                <Flex mt={2} justifyContent="space-between">
                  <Text>상</Text> <Text>세</Text> <Text>주</Text>
                  <Text>소</Text>
                </Flex>
              </FormLabel>
              <Input
                value={detailedAddress}
                onChange={(e) => setDetailedAddress(e.target.value)}
                w={"450px"}
              />
            </HStack>
          </FormControl>

          <FormControl mt={4}>
            <HStack>
              <FormLabel w={"80px"}>
                <Flex mt={2} justifyContent={"space-between"}>
                  <Text>전</Text> <Text>화</Text> <Text>번</Text>{" "}
                  <Text>호</Text>
                </Flex>
              </FormLabel>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                w={"230px"}
                mr={28}
              />

              <FormLabel w={"80px"}>
                <Flex mt={2} justifyContent="space-between">
                  <Text>팩</Text> <Text>스</Text> <Text>번</Text>{" "}
                  <Text>호</Text>
                </Flex>
              </FormLabel>
              <Input
                value={faxNumber}
                onChange={(e) => setFaxNumber(e.target.value)}
                w={"250px"}
              />
            </HStack>
          </FormControl>

          <FormControl mt={4}>
            <HStack>
              <FormLabel w={"80px"}>
                <Flex mt={2} justifyContent="space-between">
                  <Text>홈</Text> <Text>페</Text> <Text>이</Text>{" "}
                  <Text>지</Text>
                </Flex>
              </FormLabel>
              <Input
                value={homepageurl}
                onChange={(e) => setHomepageurl(e.target.value)}
                w={"450px"}
              />
            </HStack>
          </FormControl>

          <FormControl mt={4}>
            <HStack>
              <FormLabel w={"80px"}>
                <Flex mt={2} justifyContent={"space-between"}>
                  <Text>과</Text> <Text>세</Text> <Text>구</Text>{" "}
                  <Text>분</Text>
                </Flex>
              </FormLabel>
              <RadioGroup onChange={setCompanyType} value={companyType}>
                <HStack
                  justifyContent="center"
                  alignItems="center"
                  w="230px"
                  border="1px solid #E6EBF2"
                  h="35px"
                  borderRadius="5px"
                  mr={28}
                >
                  <Radio value="법인">
                    <Text>법인</Text>
                  </Radio>
                  <Radio value="개인">
                    <Text>개인</Text>
                  </Radio>
                </HStack>
              </RadioGroup>

              <FormLabel w={"80px"}>
                <Flex mt={2} justifyContent={"space-between"}>
                  <Text>해</Text> <Text>외</Text> <Text>여</Text>{" "}
                  <Text>부</Text>
                </Flex>
              </FormLabel>
              <RadioGroup onChange={setCountryType} value={countryType}>
                <HStack
                  justifyContent="center"
                  alignItems="center"
                  w="230px"
                  border="1px solid #E6EBF2"
                  h="35px"
                  borderRadius="5px"
                >
                  <Radio value="국내">
                    <Text>국내</Text>
                  </Radio>
                  <Radio value="해외">
                    <Text>해외</Text>
                  </Radio>
                </HStack>
              </RadioGroup>
            </HStack>
          </FormControl>

          <FormControl mt={4}>
            <HStack>
              <FormLabel w={"80px"}>
                <Flex mt={2} justifyContent={"space-between"}>
                  <Text>계</Text> <Text>약</Text> <Text>기</Text>
                  <Text>간</Text>
                </Flex>
              </FormLabel>
              <Input
                value={contractPeriod1}
                onChange={(e) => setContractPeriod1(e.target.value)}
                type="date"
                w={"230px"}
              />
              <Text>~</Text>
              <Input
                value={contractPeriod2}
                onChange={(e) => setContractPeriod2(e.target.value)}
                type="date"
                w={"230px"}
              />
            </HStack>
          </FormControl>

          <FormControl mt={4}>
            <HStack>
              <FormLabel w={"90px"}>
                <Flex mt={2} justifyContent={"space-between"}>
                  <Text>등</Text> <Text>록</Text> <Text>정</Text>
                  <Text>보</Text>
                </Flex>
              </FormLabel>
              <Input
                value={registrationInformation}
                onChange={(e) => setRegistrationInformation(e.target.value)}
                w={"130px"}
              />
              <Input
                value={registrationDateTime}
                onChange={(e) => setRegistrationDateTime(e.target.value)}
                type="datetime-local"
                w={"250px"}
                mr={7}
              />

              <FormLabel w={"80px"}>
                <Flex mt={2} justifyContent={"space-between"}>
                  <Text>변</Text> <Text>경</Text> <Text>정</Text>
                  <Text>보</Text>
                </Flex>
              </FormLabel>
              <Input
                value={changeInformation}
                onChange={(e) => setChangeInformation(e.target.value)}
                w={"130px"}
              />
              <Input
                value={changeDateTime}
                onChange={(e) => setChangeDateTime(e.target.value)}
                type="datetime-local"
                w={"250px"}
              />
            </HStack>
          </FormControl>

          <FormControl mt={5}>
            <Text fontWeight={"bold"}>(거래처 계좌정보)</Text>

            <Table>
              <Thead>
                <Tr>
                  <Th textAlign={"center"}>사무소</Th>
                  <Th textAlign={"center"}>은행</Th>
                  <Th textAlign={"center"}>계좌번호</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>
                    <Input
                      value={offices}
                      onChange={(e) => setOffices(e.target.value)}
                    />
                  </Td>
                  <Td>
                    <Input
                      value={bankingInformation}
                      onChange={(e) => setBankingInformation(e.target.value)}
                    />
                  </Td>
                  <Td>
                    <Input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                    />
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </FormControl>
        </Box>
      </Flex>
      <Box
        justifyContent={"center"}
        alignItems={"center"}
        display={"flex"}
        mt={10}
      >
        <Pagination pageInfo={pageInfo} />
      </Box>

      {/* -------------------------- 삭제 모달 -------------------------- */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>거래처 삭제</ModalHeader>
          <ModalCloseButton />
          <ModalBody>삭제 하시겠습니까?</ModalBody>

          <ModalFooter>
            <Button mr={3} onClick={onClose}>
              취소
            </Button>
            <Button colorScheme={"red"} onClick={handleDelete}>
              삭제
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* -------------------------- 수정 모달 -------------------------- */}
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>거래처 수정</ModalHeader>
          <ModalCloseButton />
          <ModalBody>수정 하시겠습니까?</ModalBody>

          <ModalFooter>
            <Button mr={3} onClick={onEditClose}>
              취소
            </Button>
            <Button colorScheme={"blue"} onClick={handleEditSubmit}>
              수정
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default App;
