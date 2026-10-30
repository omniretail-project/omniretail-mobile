import type {
  AddressRepository,
  AuthRepository,
  BranchRepository,
  BusinessConfigRepository,
  CartRepository,
  CategoryRepository,
  CustomerPaymentMethodRepository,
  CustomerRepository,
  FavoriteRepository,
  NotificationRepository,
  OrderRepository,
  PaymentRepository,
  ProductAvailabilityRepository,
  ProductMediaRepository,
  ProductRepository,
  PromotionRepository,
} from "@/core";

import {
  ApiAddressRepository,
  ApiAuthRepository,
  ApiBranchRepository,
  ApiBusinessConfigRepository,
  ApiCategoryRepository,
  ApiCheckoutService,
  ApiCustomerOrderService,
  ApiCustomerPaymentMethodRepository,
  ApiCustomerRepository,
  notifyApiSessionInvalidated,
  ApiProductAvailabilityRepository,
  ApiProductMediaRepository,
  ApiProductRepository,
  ApiPromotionRepository,
  ApiStorefrontConfigService,
  ApiTokenStorage,
  apiConfig,
  assertApiConfig,
  createApiClient,
  isApiMode,
} from "../api";
import { MockCredentialStore } from "../mock/auth";
import { MockDatabaseStore } from "../mock/database";
import {
  MockAddressRepository,
  MockAuthRepository,
  MockBranchRepository,
  MockBusinessConfigRepository,
  MockCartRepository,
  MockCategoryRepository,
  MockCustomerPaymentMethodRepository,
  MockCustomerRepository,
  MockFavoriteRepository,
  MockNotificationRepository,
  MockOrderRepository,
  MockPaymentRepository,
  MockProductAvailabilityRepository,
  MockProductMediaRepository,
  MockProductRepository,
  MockPromotionRepository,
} from "../mock/repositories";
import { AsyncStorageKeyValueStorage, SecureKeyValueStorage, SessionStorage } from "../storage";

export type RepositoryRegistry = {
  authRepository: AuthRepository;
  customerRepository: CustomerRepository;
  productRepository: ProductRepository;
  productMediaRepository: ProductMediaRepository;
  categoryRepository: CategoryRepository;
  promotionRepository: PromotionRepository;
  productAvailabilityRepository: ProductAvailabilityRepository;
  addressRepository: AddressRepository;
  favoriteRepository: FavoriteRepository;
  cartRepository: CartRepository;
  orderRepository: OrderRepository;
  paymentRepository: PaymentRepository;
  customerPaymentMethodRepository: CustomerPaymentMethodRepository;
  notificationRepository: NotificationRepository;
  branchRepository: BranchRepository;
  businessConfigRepository: BusinessConfigRepository;
  apiCheckoutService: ApiCheckoutService;
  apiCustomerOrderService: ApiCustomerOrderService;
  databaseStore: MockDatabaseStore;
  resetToDemoData(): Promise<void>;
};

let registry: RepositoryRegistry | null = null;

export function getRepositoryRegistry(): RepositoryRegistry {
  registry ??= createRepositoryRegistry();
  return registry;
}

/**
 * Modo API: lo que el backend ya expone es remoto. Carrito, favoritos, notificaciones
 * y pagos por pedido siguen siendo almacenamiento local deliberado (MockDatabaseStore)
 * porque el backend todavía no ofrece esos endpoints para clientes.
 * Las promociones se proyectan dinámicamente desde los productos del storefront.
 */
export function createRepositoryRegistry(): RepositoryRegistry {
  assertApiConfig();

  const databaseStorage = new AsyncStorageKeyValueStorage();
  const secureStorage = new SecureKeyValueStorage();
  const databaseStore = new MockDatabaseStore(databaseStorage);
  const credentialStore = new MockCredentialStore(secureStorage);
  const sessionStorage = new SessionStorage(secureStorage);

  const mockAuthRepository = new MockAuthRepository(
    databaseStore,
    credentialStore,
    sessionStorage,
  );
  const mockCustomerRepository = new MockCustomerRepository(databaseStore);

  const apiTokenStorage = new ApiTokenStorage(secureStorage);
  const apiCustomerRepository = new ApiCustomerRepository(() => apiClient);

  const clearApiSession = async () => {
    await apiTokenStorage.clearToken();
    await sessionStorage.clearSession();
    apiCustomerRepository.clearCurrentCustomer();
    notifyApiSessionInvalidated();
  };

  const apiClient = createApiClient(
    () => apiTokenStorage.getToken(),
    clearApiSession,
  );
  const apiAuthRepository = new ApiAuthRepository(
    apiClient,
    apiTokenStorage,
    sessionStorage,
    apiCustomerRepository,
    apiConfig.tenantSlug,
  );

  const apiCategoryRepository = new ApiCategoryRepository();
  const apiProductAvailabilityRepository =
    new ApiProductAvailabilityRepository();
  const apiProductMediaRepository = new ApiProductMediaRepository();
  const apiPromotionRepository = new ApiPromotionRepository();

  const apiProductRepository = new ApiProductRepository(
    apiClient,
    apiConfig.tenantSlug,
    apiCategoryRepository,
    apiProductAvailabilityRepository,
    apiProductMediaRepository,
    apiPromotionRepository,
  );

  const apiCheckoutService = new ApiCheckoutService(
    apiClient,
    apiConfig.tenantSlug,
  );

  const apiStorefrontConfigService = new ApiStorefrontConfigService(
    apiClient,
    apiConfig.tenantSlug,
  );
  const apiCustomerOrderService = new ApiCustomerOrderService(apiClient);

  return {
    authRepository: isApiMode()
      ? apiAuthRepository
      : mockAuthRepository,
    customerRepository: isApiMode()
      ? apiCustomerRepository
      : mockCustomerRepository,
    productRepository: isApiMode()
      ? apiProductRepository
      : new MockProductRepository(databaseStore),
    productMediaRepository: isApiMode()
      ? apiProductMediaRepository
      : new MockProductMediaRepository(databaseStore),
    categoryRepository: isApiMode()
      ? apiCategoryRepository
      : new MockCategoryRepository(databaseStore),
    promotionRepository: isApiMode()
      ? apiPromotionRepository
      : new MockPromotionRepository(databaseStore),
    productAvailabilityRepository: isApiMode()
      ? apiProductAvailabilityRepository
      : new MockProductAvailabilityRepository(databaseStore),
    addressRepository: isApiMode()
      ? new ApiAddressRepository(
          apiClient,
          () => apiCustomerRepository.getCurrentCustomer()?.name,
        )
      : new MockAddressRepository(databaseStore),
    favoriteRepository: new MockFavoriteRepository(databaseStore),
    cartRepository: new MockCartRepository(databaseStore),
    orderRepository: new MockOrderRepository(databaseStore),
    paymentRepository: new MockPaymentRepository(databaseStore),
    customerPaymentMethodRepository: isApiMode()
      ? new ApiCustomerPaymentMethodRepository(apiClient)
      : new MockCustomerPaymentMethodRepository(databaseStore),
    notificationRepository: new MockNotificationRepository(databaseStore),
    branchRepository: isApiMode()
      ? new ApiBranchRepository(apiStorefrontConfigService)
      : new MockBranchRepository(databaseStore),
    businessConfigRepository: isApiMode()
      ? new ApiBusinessConfigRepository(apiStorefrontConfigService)
      : new MockBusinessConfigRepository(databaseStore),
    apiCheckoutService,
    apiCustomerOrderService,
    databaseStore,
    async resetToDemoData() {
      await databaseStore.resetToDemoData();
      await credentialStore.resetToDemoCredentials();
      await sessionStorage.clearSession();
    },
  };
}
