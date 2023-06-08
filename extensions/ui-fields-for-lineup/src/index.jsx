import React, { useState, useEffect, useRef } from "react";
import {
  Banner,
  Text,
  BlockStack,
  View,
  render,
  TextField,
  Checkbox,
  Button,
  useExtensionCapability,
  useApplyAttributeChange,
  useCartLines,
  Spinner,
  useBuyerJourneyIntercept,
  useApplyMetafieldsChange,
  useMetafield,
  InlineLayout,
} from "@shopify/checkout-ui-extensions-react";

//Se debe agregar un campo para cedula/pasaporte (metafield igual) y debe ser requerido

render("Checkout::Dynamic::Render", () => <App />);

function App() {
  //Main variables
  const API_URL =
    "https://cors-anywhere.herokuapp.com/https://198e-2800-bf0-8014-9d-c93-236d-68d-10cd.ngrok-free.app";
  const MAIN_TOKEN =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjcmVkZW50aWFsX2lkIjoiYThlNThhMzAtODRlZi00YjMyLWFkN2MtYzcwYWZjMDkyMzBkIiwiZXhwIjoxNjg2NjY4MDI1LCJvcmlnX2lhdCI6MTY4NjA2MzIyNSwiaXNzIjoibG9jYWxob3N0LmNvbSJ9.XlRK03A6cjWzC2METd1oR-MjsXrJ5Q065LtnITVtGpM";
  const API_KEY = "9b2c299397f0cb50d8512e6067e18e1adb33a733";
  const API_SECRET = "^4-p8ijc^2sg9nh41&e$-oorj@66z@qs7f_qeofat=fkmn$hb3";
  // Define the metafield namespace and key
  const metafieldNamespace = "loyalty";
  const lineUpCardNumberKey = "lineUpCardNumber";
  const lineUpClientIdNumberKey = "lineUpClientIdNumber";

  // Set up the checkbox state
  const [useLineupCard, setUseLineupCard] = useState(false);
  const [lineupCardNumber, setLineupCardNumber] = useState("");
  const [isLineupCardValid, setIsLineupCardValid] = useState("");
  const [clientDetails, setClientDetails] = useState(null);
  const [saldoDisponible, setSaldoDisponible] = useState(null);
  const [saldoGastar, setSaldoGastar] = useState(null);
  const [cardAdded, setCardAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCardValueUpdated, setIsCardValueUpdated] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [token, setToken] = useState(MAIN_TOKEN);
  const [cedula, setCedula] = useState("");
  const [isCedulaValid, setIsCedulaValid] = useState("");

  // is timer reference
  const isTimerRunningRef = useRef(isTimerRunning);
  isTimerRunningRef.current = isTimerRunning;

  //testing
  var loop = 0;

  // Set the entry point for the extension
  const canBlockProgress = useExtensionCapability("block_progress");
  const applyAttributeChange = useApplyAttributeChange();
  // const attributes = useAttributes();
  const cartLines = useCartLines();

  // Get a reference to the metafield
  const lineUpCardNumberMetafield = useMetafield({
    namespace: metafieldNamespace,
    key: lineUpCardNumberKey,
  });

  const lineUpClientIdNumberMetafield = useMetafield({
    namespace: metafieldNamespace,
    key: lineUpClientIdNumberKey,
  });

  // Set a function to handle updating a metafield
  const applyMetafieldsChange = useApplyMetafieldsChange();

  // get the sum of all values into cartLines array in cartLines[].cost.totalAmount.amount
  const subtotal = cartLines.reduce((acc, item) => {
    return acc + item.cost.totalAmount.amount;
  }, 0);

  //Intercept the buyer journey
  useBuyerJourneyIntercept(({ canBlockProgress }) => {
    if (canBlockProgress && isCardValueUpdated) {
      return {
        behavior: "block",
        reason: "La Tarjeta Lineup Rewards ha actualizado su saldo",
        errors: [
          {
            message:
              "El saldo de su tarjeta Lineup Rewards ha cambiado, eliminela o acepte el nuevo saldo para proceder con el pago",
          },
        ],
      };
    } else {
      return {
        behavior: "allow",
      };
    }
  });

  function resetCard() {
    setLineupCardNumber("");
    setIsLineupCardValid("");
    setCedula("");
    setIsCedulaValid("");
    setSaldoDisponible(null);
    setCardAdded(false);
    setClientDetails(null);
    setIsTimerRunning(false);
    setIsCardValueUpdated(false);
    applyAttributeChange({
      key: "lineupCardValue",
      type: "updateAttribute",
      value: "null",
    });
    // Apply the change to the metafield lineup number
    applyMetafieldsChange({
      type: "updateMetafield",
      namespace: metafieldNamespace,
      key: lineUpCardNumberKey,
      valueType: "string",
      value: "",
    });
    // Apply the change to the metafield lineup client
    applyMetafieldsChange({
      type: "updateMetafield",
      namespace: metafieldNamespace,
      key: lineUpClientIdNumberKey,
      valueType: "string",
      value: "",
    });
  }

  // Use effect to clear the card number and value when the user unchecks the checkbox
  useEffect(() => {
    resetCard();
  }, [useLineupCard]);

  // function to clear validation errors
  function clearValidationErrors() {
    setIsLineupCardValid("");
    setIsCedulaValid("");
  }

  // function to handle the checkbox change
  async function handleButtonClick() {
    if (useLineupCard) {
      // Inicializa un array para almacenar los errores de validación.
      let errors = {
        lineup: "",
        cedula: "",
      };

      //Start validations
      const regex = /^[0-9]+$/;

      //Validaciones de Lineup
      if (lineupCardNumber.trim() === "") {
        errors.lineup = "Ingresa el número de tarjeta";
      } else if (lineupCardNumber.length < 9) {
        errors.lineup = "La tarjeta debe tener más de 9 dígitos";
      } else if (!regex.test(lineupCardNumber)) {
        errors.lineup = "La tarjeta solo debe contener números";
      }

      //Validaciones de Cedula
      if (cedula.trim() === "") {
        errors.cedula = "Ingresa su Identificación";
      } else if (cedula.length < 9) {
        errors.cedula = "La Identificación debe tener mínimo 9 dígitos";
      } else if (!regex.test(cedula)) {
        errors.cedula = "La Identificación solo debe contener números";
      }

      // Si hay errores, establece los mensajes de error y retorna.
      if (errors.lineup || errors.cedula) {
        setIsLineupCardValid(errors.lineup);
        setIsCedulaValid(errors.cedula);
        return;
      }

      // Add a loading spinner
      setIsLoading(true);

      // Simulate an API call
      const data = await apiCall();

      // Remove the loading spinner
      setIsLoading(false);

      if (data.esValido) {
        const saldo =
          data.saldo >= subtotal ? subtotal.toString() : data.saldo.toString();
        setSaldoDisponible(data.saldo);
        setSaldoGastar(saldo);
        setCardAdded(true);
        setClientDetails(data.extra);
        clearValidationErrors();

        // adds the value of the card to the attributes
        await applyAttributeChange({
          key: "lineupCardValue",
          type: "updateAttribute",
          value: saldo,
        });

        // Apply the change to the metafield lineup number
        await applyMetafieldsChange({
          type: "updateMetafield",
          namespace: metafieldNamespace,
          key: lineUpCardNumberKey,
          valueType: "string",
          value: lineupCardNumber,
        });

        // Apply the change to the metafield lineup client
        await applyMetafieldsChange({
          type: "updateMetafield",
          namespace: metafieldNamespace,
          key: lineUpClientIdNumberKey,
          valueType: "string",
          value: cedula,
        });

        //----------------------Timer----------------------//

        // Set the flag to start the timer
        setIsTimerRunning(true);

        // Start the timer loop
        startTimerLoop(data.saldo);
      } else {
        setIsLineupCardValid(
          "El número de la tarjeta Lineup Rewards o la cédula son inválidos"
        );
        setIsCedulaValid(
          "El número de la tarjeta Lineup Rewards o la cédula son inválidos"
        );
      }
    }
  }

  async function apiCall() {
    //100799072

    //Headers
    var myHeaders = new Headers();
    myHeaders.append("X-Requested-With", "");
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${token}`);

    //Body
    var raw = JSON.stringify({
      tarjeta: {
        numero_de_tarjeta: lineupCardNumber,
        cedula: cedula,
      },
    });

    //options
    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    //Call
    try {
      const response = await fetch(
        API_URL + "/api/cliente/obtener-balance-easy/",
        requestOptions
      );

      // Si el status es 401, obtenemos un nuevo token y reintentamos la llamada
      if (response.status === 401) {
        console.log("El token ha expirado, obteniendo uno nuevo...");
        const newToken = await getNewToken();

        // Actualizamos el token en las opciones de la solicitud
        requestOptions.headers.set("Authorization", `Bearer ${newToken}`);

        // Intentamos la llamada nuevamente
        const response = await fetch(apiUrl, requestOptions);

        // Si el status sigue siendo 401, lanzamos un error
        if (response.status === 401) {
          throw new Error("Error de autenticación después de renovar el token");
        }
      }

      if (response.status === 404) {
        return {
          esValido: false,
          saldo: 0,
        };
      }

      if (response.status === 400) {
        return {
          esValido: false,
          saldo: 0,
        };
      }

      const responseData = await response.json();
      return {
        esValido: true,
        saldo: responseData.credito,
        extra: responseData,
      };
    } catch (error) {
      // Manejo de errores de la llamada fetch
      console.error("Error en la llamada API:", error);
      throw error;
    }
  }

  // Function to start the timer loop
  async function startTimerLoop(saldo) {
    let previousSaldo = saldo;

    // Start the timer loop
    while (isTimerRunningRef.current) {
      // Wait for 5 seconds / 30Seconds
      await sleep(30000);
      // await sleep(1000);

      let updatedData = await apiCall();
      let updatedSaldoGastar =
        updatedData.saldo >= subtotal
          ? subtotal.toString()
          : updatedData.saldo.toString();

      //testing

      console.log("previousSaldo", previousSaldo);
      console.log("saldoGastar", updatedData.saldo);
      //end testing

      if (updatedData.saldo !== previousSaldo) {
        console.log("saldo actualizado");

        setSaldoDisponible(updatedData.saldo);
        setSaldoGastar(updatedSaldoGastar);
        setIsCardValueUpdated(true);
        setIsTimerRunning(false);

        // Update the attribute value and metafield with the updated card value
        await applyAttributeChange({
          key: "lineupCardValue",
          type: "updateAttribute",
          value: updatedSaldoGastar,
        });

        break;
      }

      loop++;
      previousSaldo = updatedData.saldo;

      // Wait for the next iteration
      await Promise.resolve();
    }
  }

  // Utility function to sleep for a specified amount of time
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // function to handle the remove card button
  function handleAccept() {
    setIsCardValueUpdated(false);
  }

  async function getNewToken() {
    //Headers
    var myHeaders = new Headers();
    myHeaders.append("X-Requested-With", "");
    myHeaders.append("Content-Type", "application/json");

    //Body
    var raw = JSON.stringify({
      api_key: API_KEY,
      api_secret: API_SECRET,
    });

    //options
    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    //Call
    try {
      const response = await fetch(
        API_URL + "/api/auth/access_token/",
        requestOptions
      );

      // Si el status sigue siendo 401, lanzamos un error
      if (response.status === 401) {
        throw new Error("Error de autenticación después de renovar el token");
      }
      const new_token = response.json().token;
      setToken(new_token);
      return new_token;
    } catch (error) {
      // Manejo de errores de la llamada fetch
      console.error("Error en la llamada API:", error);
      throw error;
    }
  }

  // Return the JSX to render
  return (
    <BlockStack>
      <View padding="base">
        <Banner status="info">
          <Checkbox
            checked={useLineupCard}
            onChange={setUseLineupCard}
            disabled={isLoading ? true : false}
          >
            {useLineupCard
              ? "Eliminar tarjeta Lineup Rewards"
              : "Usar tarjeta Lineup Rewards para obtener un descuento"}
          </Checkbox>
        </Banner>
      </View>
      {useLineupCard && (
        <BlockStack spacing="base">
          {!cardAdded && (
            <BlockStack spacing="base">
              <TextField
                label="Cedula o Pasaporte"
                value={cedula}
                onChange={setCedula}
                onInput={clearValidationErrors}
                required={canBlockProgress}
                disabled={isLoading ? true : false}
                error={isCedulaValid}
              />
              <TextField
                label="Número de tarjeta Lineup Rewards"
                value={lineupCardNumber}
                onChange={setLineupCardNumber}
                onInput={clearValidationErrors}
                required={canBlockProgress}
                disabled={isLoading ? true : false}
                error={isLineupCardValid}
              />
              <Button
                disabled={isLoading ? true : false}
                onPress={handleButtonClick}
              >
                Agregar tarjeta lineup para esta compra
              </Button>
              {isLoading && <Spinner />} {/* Loader */}
            </BlockStack>
          )}
          {saldoDisponible !== null && cardAdded && (
            <Banner
              status={!isCardValueUpdated ? "success" : "warning"}
              title="Tarjeta Lineup Rewards Agregada"
            >
              <BlockStack>
                <Text>Cliente: {clientDetails?.correo}</Text>
                <Text>Cédula: {lineUpClientIdNumberMetafield?.value}</Text>
                <Text>
                  Número de tarjeta: {lineUpCardNumberMetafield?.value}
                </Text>
                <Text>Saldo disponible en la tarjeta: ${saldoDisponible}</Text>
                <Text appearance="info">
                  Valor de la tarjeta a utilizar en la compra: $ {saldoGastar}
                </Text>

                {!isCardValueUpdated && (
                  <Button kind="secondary" onPress={resetCard}>
                    Eliminar tarjeta
                  </Button>
                )}

                {isCardValueUpdated && (
                  <InlineLayout columns={["fill", "fill"]} spacing="base">
                    <Button kind="secondary" onPress={resetCard}>
                      Eliminar tarjeta
                    </Button>
                    <Button kind="primary" onPress={handleAccept}>
                      Aceptar el nuevo valor
                    </Button>
                  </InlineLayout>
                )}
              </BlockStack>
            </Banner>
          )}
        </BlockStack>
      )}
    </BlockStack>
  );
}

export default App;
>>>>>>> ff066a68141bcd89953971845cef0d819a55f5af
